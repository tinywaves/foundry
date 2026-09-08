import type { CreateProviderRequest } from '@dhzh/foundry-api-contract';
import { Buffer } from 'node:buffer';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';

import { openFoundryDatabase } from '../src/server/database';
import { DrizzleProviderStore } from '../src/server/providers/store';
import { parseClaudeCodeProviderConfiguration } from '../src/server/providers/validation';

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
      defaultModel: 'codex-model',
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
      defaultModel: 'claude-model',
      protocol: 'messages',
      sonnetModel: null,
      subagentModel: 'claude-subagent',
      subagentModelForce: true,
      hideAiAttribution: true,
      teammatesMode: true,
      enableToolSearch: true,
      maxEffortThinking: true,
      disableAutoUpdater: true,
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

it('normalizes legacy Claude Provider model configuration', () => {
  expect(parseClaudeCodeProviderConfiguration({
    apiKey: 'legacy-secret',
    apiKeyHeader: 'authorization',
    baseUrl: 'https://legacy.example.com',
    fableModel: null,
    haikuModel: null,
    opusModel: null,
    defaultModel: {
      description: 'Legacy metadata',
      displayName: 'Legacy default',
      model: 'legacy-default',
      supportedCapabilities: ['thinking'],
    },
    protocol: 'messages',
    sonnetModel: null,
    subagentModel: null,
  })).toMatchObject({
    defaultModel: 'legacy-default',
    subagentModelForce: false,
    hideAiAttribution: false,
    teammatesMode: false,
    enableToolSearch: false,
    maxEffortThinking: false,
    disableAutoUpdater: false,
  });
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

it('creates an imported Provider batch atomically', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  let idSequence = 0;
  const store = new DrizzleProviderStore(
    database.db,
    () => 100,
    () => `provider-${++idSequence}`,
  );
  const invalidProvider = {
    ...createCodexProvider('Invalid'),
    configuration: {
      ...createCodexProvider('Invalid').configuration,
      baseUrl: 'not-a-url',
    },
  };

  try {
    expect(() => store.createProviders([
      createCodexProvider('Rolled back'),
      invalidProvider,
    ])).toThrow();
    expect(store.listProviders('codex')).toEqual([]);

    const imported = store.createProviders([
      createCodexProvider('First'),
      createCodexProvider('Second'),
    ]);
    expect(imported).toHaveLength(2);
    expect(store.listProviders('codex')).toHaveLength(2);
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

it('soft-deletes a Provider that is not in use', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const writeTimes = [100, 200];
  const store = new DrizzleProviderStore(
    database.db,
    () => writeTimes.shift() ?? 0,
    () => 'provider',
  );

  try {
    store.createProvider(createCodexProvider('Delete me'));

    expect(store.deleteProvider('provider')).toBe('deleted');
    expect(store.getProvider('provider')).toBeNull();
    expect(store.listProviders('codex')).toEqual([]);
    expect(store.deleteProvider('provider')).toBe('not-found');
  } finally {
    database.client.close();
  }
});

it('does not delete a Provider that is in use', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const store = new DrizzleProviderStore(database.db, () => 100, () => 'provider');

  try {
    const provider = store.createProvider(createCodexProvider('In use'));
    database.client.prepare(`
      UPDATE runtimes
      SET managed = 1, provider_id = ?, applied_at = 200
      WHERE runtime = 'codex'
    `).run(provider.id);

    expect(store.deleteProvider(provider.id)).toBe('in-use');
    expect(store.getProvider(provider.id)).toEqual(provider);
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

it('updates a Codex Provider with its complete configuration', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const writeTimes = [100, 200, 300, 400];
  const store = new DrizzleProviderStore(
    database.db,
    () => writeTimes.shift() ?? 0,
    () => 'provider',
  );

  try {
    const original = createCodexProvider('Original');
    const created = store.createProvider(original);
    const update = {
      ...original,
      avatar: null,
      configuration: {
        ...original.configuration,
        baseUrl: 'https://updated.example.com/v1',
      },
      name: 'Updated',
      officialWebsite: null,
      remark: 'Updated remark',
      runtime: 'codex',
    } satisfies CreateProviderRequest;

    const preserved = store.updateProvider(created.id, update);
    expect(preserved).toMatchObject({
      avatar: null,
      configuration: {
        apiKey: 'codex-secret',
        baseUrl: 'https://updated.example.com/v1',
      },
      createdAt: 100,
      name: 'Updated',
      officialWebsite: null,
      remark: 'Updated remark',
      updatedAt: 200,
    });

    const replaced = store.updateProvider(created.id, {
      ...update,
      configuration: { ...update.configuration, apiKey: 'replacement-secret' },
    });
    expect(replaced?.configuration.apiKey).toBe('replacement-secret');
    expect(replaced?.updatedAt).toBe(300);

    const removed = store.updateProvider(created.id, {
      ...update,
      configuration: { ...update.configuration, apiKey: null },
    });
    expect(removed?.configuration.apiKey).toBeNull();
    expect(removed?.updatedAt).toBe(400);
  } finally {
    database.client.close();
  }
});

it('copies a Provider into an independent record', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const writeTimes = [100, 200];
  const ids = ['source', 'copy'];
  const store = new DrizzleProviderStore(
    database.db,
    () => writeTimes.shift() ?? 0,
    () => ids.shift() ?? 'missing',
  );

  try {
    const original = createCodexProvider('Original');
    const source = store.createProvider(original);
    const copied = store.copyProvider(source.id, {
      avatar: source.avatar,
      configuration: original.configuration,
      name: 'Original Copy',
      officialWebsite: source.officialWebsite,
      remark: source.remark,
      runtime: 'codex',
    });

    expect(copied).toMatchObject({
      configuration: { apiKey: 'codex-secret' },
      createdAt: 200,
      id: 'copy',
      name: 'Original Copy',
      updatedAt: 200,
    });
    expect(store.getProvider(source.id)).toEqual(source);
    expect(store.listProviders('codex')).toHaveLength(2);
  } finally {
    database.client.close();
  }
});

it('updates a Claude Code Provider with its complete configuration', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const store = new DrizzleProviderStore(database.db, () => 100, () => 'provider');

  try {
    const original = createClaudeProvider('Claude');
    const created = store.createProvider(original);
    const updated = store.updateProvider(created.id, {
      avatar: created.avatar,
      configuration: original.configuration,
      name: 'Updated Claude',
      officialWebsite: created.officialWebsite,
      remark: created.remark,
      runtime: 'claude-code',
    });

    expect(updated?.configuration.apiKey).toBe('claude-secret');
    expect(updated?.name).toBe('Updated Claude');
  } finally {
    database.client.close();
  }
});

it('does not update a missing Provider or change a Provider Runtime', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const store = new DrizzleProviderStore(database.db, () => 100, () => 'provider');

  try {
    const update = createClaudeProvider('Claude');
    expect(store.updateProvider('missing', update)).toBeNull();
    expect(store.copyProvider('missing', update)).toBeNull();
    store.createProvider(createCodexProvider('Codex'));
    expect(() => store.updateProvider('provider', update)).toThrow(
      'A Provider Runtime cannot be changed.',
    );
    expect(() => store.copyProvider('provider', update)).toThrow(
      'A Provider Runtime cannot be changed.',
    );
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
