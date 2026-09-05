import type { CreateProviderRequest } from '@dhzh/foundry-api-contract';
import { Buffer } from 'node:buffer';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';

import { openFoundryDatabase } from '../src/server/database';
import { DrizzleProviderStore } from '../src/server/providers/store';

const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');
const temporaryRoots: string[] = [];
const avatarData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const svgAvatarData = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
).toString('base64');

async function createDatabasePath(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'foundry-provider-store-'));
  temporaryRoots.push(root);
  return path.join(root, 'foundry.sqlite');
}

function createCodexProvider(
  name: string,
): Extract<CreateProviderRequest, { runtime: 'codex' }> {
  return {
    avatar: { data: avatarData, mimeType: 'image/png' },
    configuration: {
      apiKey: 'codex-secret',
      baseUrl: 'https://codex.example.com/v1',
      primaryModel: 'codex-model',
      protocol: 'responses',
      reviewModel: 'codex-review',
    },
    name,
    officialWebsite: 'https://codex.example.com',
    remark: 'Codex remark',
    runtime: 'codex',
  };
}

function createClaudeProvider(
  name: string,
): Extract<CreateProviderRequest, { runtime: 'claude-code' }> {
  return {
    avatar: null,
    configuration: {
      apiKey: 'claude-secret',
      apiKeyHeader: 'x-api-key',
      baseUrl: 'https://claude.example.com',
      fableModel: null,
      haikuModel: null,
      opusModel: null,
      primaryModel: {
        description: null,
        displayName: 'Claude Primary',
        model: 'claude-model',
        supportedCapabilities: ['thinking'],
      },
      protocol: 'messages',
      sonnetModel: null,
      subagentModel: 'claude-subagent',
    },
    name,
    officialWebsite: null,
    remark: null,
    runtime: 'claude-code',
  };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })));
});

it('persists duplicate Provider names and lists the newest matching Runtime first', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const writeTimes = [100, 200, 300];
  const ids = ['codex-first', 'claude', 'codex-second'];
  const store = new DrizzleProviderStore(
    database.db,
    () => writeTimes.shift() ?? 0,
    () => ids.shift() ?? 'missing',
  );

  try {
    const first = store.createProvider(createCodexProvider('Duplicate'));
    store.createProvider(createClaudeProvider('Duplicate'));
    const second = store.createProvider(createCodexProvider('Duplicate'));

    expect(store.listProviders('codex')).toEqual([second, first]);
    expect(store.listProviders('claude-code')).toHaveLength(1);
    expect(first.configuration.apiKey).toBe('codex-secret');
    expect(first.avatar).toEqual({
      data: avatarData,
      mimeType: 'image/png',
    });
  } finally {
    database.client.close();
  }
});

it('does not list soft-deleted Providers', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const store = new DrizzleProviderStore(database.db, () => 100, () => 'provider');

  try {
    store.createProvider(createCodexProvider('Deleted'));
    database.client.prepare(`
      UPDATE providers SET deleted_at = 101 WHERE id = 'provider'
    `).run();

    expect(store.listProviders('codex')).toEqual([]);
    expect(store.getProvider('provider')).toBeNull();
  } finally {
    database.client.close();
  }
});

it('reads a Provider by ID', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const store = new DrizzleProviderStore(database.db, () => 100, () => 'provider');

  try {
    const provider = store.createProvider(createCodexProvider('By ID'));
    expect(store.getProvider(provider.id)).toEqual(provider);
    expect(store.getProvider('missing')).toBeNull();
  } finally {
    database.client.close();
  }
});

it('persists SVG Provider avatars', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const store = new DrizzleProviderStore(database.db);

  try {
    const provider = store.createProvider({
      ...createCodexProvider('SVG Avatar'),
      avatar: { data: svgAvatarData, mimeType: 'image/svg+xml' },
    });

    expect(provider.avatar).toEqual({
      data: svgAvatarData,
      mimeType: 'image/svg+xml',
    });
  } finally {
    database.client.close();
  }
});

it('rejects invalid Provider data before persistence', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const store = new DrizzleProviderStore(database.db);

  try {
    expect(() => store.createProvider({
      ...createCodexProvider('Invalid'),
      configuration: {
        ...createCodexProvider('Invalid').configuration,
        baseUrl: 'not-a-url',
      },
    })).toThrow();
  } finally {
    database.client.close();
  }
});
