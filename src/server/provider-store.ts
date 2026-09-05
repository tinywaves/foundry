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

import type { FoundryDatabase } from './database';
import { providers } from './database/schema';
import {
  decodeProviderAvatar,
  parseCreateProviderRequest,
  parseClaudeCodeProviderConfiguration,
  parseCodexProviderConfiguration,
} from './provider-validation';

export interface ProviderStore {
  createProvider: (input: CreateProviderRequest) => Provider;
  listProviders: (runtime: ProviderRuntime) => Provider[];
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

  listProviders(runtime: ProviderRuntime): Provider[] {
    const rows = this.database.select().from(providers).where(
      and(eq(providers.runtime, runtime), isNull(providers.deletedAt)),
    ).orderBy(desc(providers.createdAt), desc(providers.id)).all();

    return rows.map((row) => mapProvider(row));
  }
}
