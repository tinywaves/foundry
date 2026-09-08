import type {
  CreateProviderRequest,
  Provider,
  ProviderAvatar,
  ProviderAvatarMimeType,
  ProviderRuntime,
} from '@dhzh/foundry-api-contract';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Buffer } from 'node:buffer';
import { randomUUIDv7 } from 'node:crypto';

import type { FoundryDatabase } from '../database';
import { providers, runtimes } from '../database/schema';
import {
  decodeProviderAvatar,
  parseCreateProviderRequest,
  parseClaudeCodeProviderConfiguration,
  parseCodexProviderConfiguration,
} from './validation';

export interface ProviderStore {
  copyProvider: (id: string, input: CreateProviderRequest) => Provider | null;
  createProvider: (input: CreateProviderRequest) => Provider;
  deleteProvider: (id: string) => 'deleted' | 'in-use' | 'not-found';
  getProvider: (id: string) => Provider | null;
  listProviders: (runtime: ProviderRuntime) => Provider[];
  updateProvider: (id: string, input: CreateProviderRequest) => Provider | null;
}

interface ProviderRow {
  avatarData: Buffer | null;
  avatarMimeType: ProviderAvatarMimeType | null;
  configuration: unknown;
  createdAt: number;
  deletedAt: number | null;
  id: string;
  name: string;
  officialWebsite: string | null;
  remark: string | null;
  runtime: ProviderRuntime;
  updatedAt: number;
}

function encodeProviderAvatar(row: ProviderRow): ProviderAvatar | null {
  if (row.avatarMimeType === null && row.avatarData === null) {
    return null;
  }
  if (row.avatarMimeType === null || row.avatarData === null) {
    throw new Error('Stored Provider avatar is invalid.');
  }

  return {
    data: row.avatarData.toString('base64'),
    mimeType: row.avatarMimeType,
  };
}

function mapProvider(row: ProviderRow): Provider {
  const common = {
    avatar: encodeProviderAvatar(row),
    createdAt: row.createdAt,
    id: row.id,
    name: row.name,
    officialWebsite: row.officialWebsite,
    remark: row.remark,
    updatedAt: row.updatedAt,
  };

  return row.runtime === 'codex'
    ? {
        ...common,
        configuration: parseCodexProviderConfiguration(row.configuration),
        runtime: row.runtime,
      }
    : {
        ...common,
        configuration: parseClaudeCodeProviderConfiguration(row.configuration),
        runtime: row.runtime,
      };
}

export class DrizzleProviderStore implements ProviderStore {
  constructor(
    private readonly database: FoundryDatabase['db'],
    private readonly now: () => number = Date.now,
    private readonly createId: () => string = randomUUIDv7,
  ) {}

  createProvider(rawInput: CreateProviderRequest): Provider {
    const input = parseCreateProviderRequest(rawInput);
    const avatarData = decodeProviderAvatar(input.avatar);
    const timestamp = this.now();
    const id = this.createId();

    this.database.insert(providers).values({
      avatarData,
      avatarMimeType: input.avatar?.mimeType ?? null,
      configuration: input.configuration,
      createdAt: timestamp,
      deletedAt: null,
      id,
      name: input.name,
      officialWebsite: input.officialWebsite,
      remark: input.remark,
      runtime: input.runtime,
      updatedAt: timestamp,
    }).run();

    return mapProvider({
      avatarData,
      avatarMimeType: input.avatar?.mimeType ?? null,
      configuration: input.configuration,
      createdAt: timestamp,
      deletedAt: null,
      id,
      name: input.name,
      officialWebsite: input.officialWebsite,
      remark: input.remark,
      runtime: input.runtime,
      updatedAt: timestamp,
    });
  }

  copyProvider(id: string, rawInput: CreateProviderRequest): Provider | null {
    const existing = this.getProvider(id);
    if (existing === null) {
      return null;
    }

    const input = parseCreateProviderRequest(rawInput);
    if (input.runtime !== existing.runtime) {
      throw new Error('A Provider Runtime cannot be changed.');
    }
    return this.createProvider(input);
  }

  deleteProvider(id: string): 'deleted' | 'in-use' | 'not-found' {
    return this.database.transaction(() => {
      const provider = this.database.select({ id: providers.id })
        .from(providers)
        .where(and(eq(providers.id, id), isNull(providers.deletedAt)))
        .get();
      if (!provider) {
        return 'not-found';
      }

      const assignment = this.database.select({ providerId: runtimes.providerId })
        .from(runtimes)
        .where(eq(runtimes.providerId, id))
        .get();
      if (assignment) {
        return 'in-use';
      }

      const result = this.database.update(providers).set({
        deletedAt: this.now(),
      }).where(and(eq(providers.id, id), isNull(providers.deletedAt))).run();
      return result.changes === 1 ? 'deleted' : 'not-found';
    });
  }

  getProvider(id: string): Provider | null {
    const row = this.database.select().from(providers).where(
      and(eq(providers.id, id), isNull(providers.deletedAt)),
    ).get();

    return row ? mapProvider(row) : null;
  }

  listProviders(runtime: ProviderRuntime): Provider[] {
    const rows = this.database.select().from(providers).where(
      and(eq(providers.runtime, runtime), isNull(providers.deletedAt)),
    ).orderBy(desc(providers.createdAt), desc(providers.id)).all();

    return rows.map((row) => mapProvider(row));
  }

  updateProvider(id: string, rawInput: CreateProviderRequest): Provider | null {
    const existing = this.getProvider(id);
    if (existing === null) {
      return null;
    }

    const input = parseCreateProviderRequest(rawInput);
    if (input.runtime !== existing.runtime) {
      throw new Error('A Provider Runtime cannot be changed.');
    }
    const avatarData = decodeProviderAvatar(input.avatar);
    const timestamp = this.now();

    this.database.update(providers).set({
      avatarData,
      avatarMimeType: input.avatar?.mimeType ?? null,
      configuration: input.configuration,
      name: input.name,
      officialWebsite: input.officialWebsite,
      remark: input.remark,
      updatedAt: timestamp,
    }).where(
      and(eq(providers.id, id), isNull(providers.deletedAt)),
    ).run();

    return this.getProvider(id);
  }
}
