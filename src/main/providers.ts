import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { desc, eq, ne } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { FoundryDatabase } from './database';
import { providers } from './database/schema';

import type { CustomModel, Provider, ProviderInput, ProviderListItem, ProviderProtocol, ProviderStatus, ProviderSummary, RemoteModel } from '../shared/providers';

type Database = FoundryDatabase['db'];

type ProviderRow = typeof providers.$inferSelect;

function toProvider(row: ProviderRow): Provider {
  return {
    id: row.id,
    name: row.name,
    protocol: row.protocol as ProviderProtocol,
    baseURL: row.baseURL,
    apiKey: row.apiKey,
    customModels: JSON.parse(row.customModels) as CustomModel[],
    status: row.status as ProviderStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

function summary(row: ProviderRow): ProviderSummary {
  const provider = toProvider(row);
  return { ...provider, hasApiKey: Boolean(provider.apiKey) };
}

export function listProviders(db: Database, usedProviderIds = new Set<string>(), shouldIncludeDeleted = false): ProviderListItem[] {
  const query = db.select().from(providers);
  const rows = shouldIncludeDeleted
    ? query.orderBy(desc(providers.updatedAt)).all()
    : query.where(ne(providers.status, 'deleted')).orderBy(desc(providers.updatedAt)).all();
  return rows.map((row) => ({ ...summary(row), isInUse: usedProviderIds.has(row.id) }));
}

export function getProvider(db: Database, id: string): ProviderSummary | null {
  const row = db.select().from(providers).where(eq(providers.id, id)).get();
  return row ? summary(row) : null;
}

export function saveProvider(db: Database, input: ProviderInput, id?: string): ProviderSummary {
  const existing = id ? db.select().from(providers).where(eq(providers.id, id)).get() : undefined;
  if (id && !existing) {
    throw new Error('Provider not found');
  }

  const timestamp = new Date();
  const values = {
    name: input.name,
    protocol: input.protocol,
    baseURL: input.baseURL,
    apiKey: input.apiKey || existing?.apiKey || '',
    customModels: JSON.stringify(input.customModels),
    updatedAt: timestamp,
  };

  const row = existing
    ? db.update(providers).set(values).where(eq(providers.id, id!)).returning().get()
    : db.insert(providers).values({
        id: randomUUID(),
        ...values,
        status: 'active',
        createdAt: timestamp,
        deletedAt: null,
      }).returning().get();

  return summary(row);
}

export function setProviderStatus(
  db: Database,
  id: string,
  status: 'active' | 'disabled' | 'deleted',
  usedProviderIds = new Set<string>(),
): ProviderSummary {
  if (usedProviderIds.has(id) && (status === 'disabled' || status === 'deleted')) {
    throw new Error('Provider is currently in use');
  }
  const row = db.update(providers)
    .set({ status, deletedAt: status === 'deleted' ? new Date() : null, updatedAt: new Date() })
    .where(eq(providers.id, id))
    .returning()
    .get();
  return summary(row);
}

export async function fetchProviderModels(db: Database, id: string): Promise<RemoteModel[]> {
  const row = db.select().from(providers).where(eq(providers.id, id)).get();
  if (!row) {
    throw new Error('Provider not found');
  }
  return fetchModelsWithSdk(toProvider(row));
}

export async function fetchModelsForInput(input: Pick<Provider, 'protocol' | 'baseURL' | 'apiKey'>): Promise<RemoteModel[]> {
  return fetchModelsWithSdk(input);
}

async function fetchModelsWithSdk(input: Pick<Provider, 'protocol' | 'baseURL' | 'apiKey'>): Promise<RemoteModel[]> {
  if (input.protocol === 'anthropic-messages') {
    const client = new Anthropic({ apiKey: input.apiKey, baseURL: input.baseURL });
    const page = await client.models.list();
    return page.data.map((model) => ({ id: model.id }));
  }

  const client = new OpenAI({ apiKey: input.apiKey || 'local-provider', baseURL: input.baseURL });
  const page = await client.models.list();
  return page.data.map((model) => ({ id: model.id }));
}
