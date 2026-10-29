import { randomUUID } from 'node:crypto';
import { desc, eq, ne } from 'drizzle-orm';
import type { FoundryDatabase } from '../../storage/database';
import { providers } from '../../storage/schema';
import { parseCustomModels } from './contracts';
import type {
  ProviderConnection,
  ProviderInput,
  ProviderStatus,
  ProviderSummary,
} from './contracts';

type Database = FoundryDatabase['db'];
type ProviderRow = typeof providers.$inferSelect;

export class ProviderNotFoundError extends Error {
  readonly code = 'PROVIDER_NOT_FOUND';

  constructor() {
    super('Provider not found');
    this.name = 'ProviderNotFoundError';
  }
}

export class ProviderRepository {
  constructor(private readonly db: Database) {}

  list(): ProviderSummary[] {
    return this.db
      .select()
      .from(providers)
      .where(ne(providers.status, 'deleted'))
      .orderBy(desc(providers.updatedAt))
      .all()
      .map((row) => toProviderSummary(row));
  }

  get(id: string): ProviderSummary | null {
    const row = this.db.select().from(providers).where(eq(providers.id, id)).get();
    return row ? toProviderSummary(row) : null;
  }

  getConnection(id: string): ProviderConnection | null {
    const row = this.db.select().from(providers).where(eq(providers.id, id)).get();
    if (!row || row.status === 'deleted') {
      return null;
    }

    return {
      protocol: row.protocol as ProviderConnection['protocol'],
      baseURL: row.baseURL,
      apiKey: row.apiKey,
    };
  }

  save(input: ProviderInput, id?: string): ProviderSummary {
    const existing = id
      ? this.db.select().from(providers).where(eq(providers.id, id)).get()
      : undefined;

    if (id && !existing) {
      throw new ProviderNotFoundError();
    }

    const timestamp = new Date();
    const values = {
      name: input.name,
      protocol: input.protocol,
      baseURL: input.baseURL,
      apiKey: input.shouldClearApiKey ? '' : input.apiKey || existing?.apiKey || '',
      customModels: JSON.stringify(input.customModels),
      updatedAt: timestamp,
    };

    const row = existing && id
      ? this.db.update(providers).set(values).where(eq(providers.id, id)).returning().get()
      : this.db.insert(providers).values({
          id: randomUUID(),
          ...values,
          status: 'active',
          createdAt: timestamp,
          deletedAt: null,
        }).returning().get();

    return toProviderSummary(row);
  }

  setStatus(id: string, status: ProviderStatus): ProviderSummary {
    const rows = this.db
      .update(providers)
      .set({
        status,
        deletedAt: status === 'deleted' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(providers.id, id))
      .returning()
      .all();

    if (rows.length === 0) {
      throw new ProviderNotFoundError();
    }

    return toProviderSummary(rows[0]);
  }
}

function toProviderSummary(row: ProviderRow): ProviderSummary {
  return {
    id: row.id,
    name: row.name,
    protocol: row.protocol as ProviderSummary['protocol'],
    baseURL: row.baseURL,
    customModels: parseCustomModels(JSON.parse(row.customModels)),
    status: row.status as ProviderSummary['status'],
    hasApiKey: Boolean(row.apiKey),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}
