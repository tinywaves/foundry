import type { CreateProviderRequest } from '@dhzh/foundry-api-contract';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';

import { openFoundryDatabase } from '../src/server/database';
import { DrizzleProviderStore } from '../src/server/providers/store';
import { RuntimeOperationError } from '../src/server/runtimes/error';
import { DrizzleRuntimeStore } from '../src/server/runtimes/store';

const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');
const temporaryRoots: string[] = [];

async function createDatabasePath(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'foundry-runtime-store-'));
  temporaryRoots.push(root);
  return path.join(root, 'foundry.sqlite');
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })));
});

const providerInput = {
  avatar: null,
  configuration: {
    apiKey: 'secret',
    baseUrl: 'https://example.com/v1',
    primaryModel: 'example-model',
    protocol: 'responses',
    reviewModel: null,
  },
  name: 'Example',
  officialWebsite: null,
  remark: null,
  runtime: 'codex',
} satisfies CreateProviderRequest;

it('lists the two seeded unmanaged Runtime assignments', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });

  try {
    expect(new DrizzleRuntimeStore(database.db).listAssignments()).toEqual([
      {
        appliedAt: null,
        managed: false,
        providerId: null,
        runtime: 'codex',
      },
      {
        appliedAt: null,
        managed: false,
        providerId: null,
        runtime: 'claude-code',
      },
    ]);
  } finally {
    database.client.close();
  }
});

it('records Provider and Official Default assignments', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const provider = new DrizzleProviderStore(
    database.db,
    () => 100,
    () => 'provider-id',
  ).createProvider(providerInput);
  const times = [200, 300];
  const store = new DrizzleRuntimeStore(database.db, () => times.shift() ?? 0);

  try {
    expect(store.recordAssignment('codex', {
      kind: 'provider',
      providerId: provider.id,
    })).toEqual({
      appliedAt: 200,
      managed: true,
      providerId: provider.id,
      runtime: 'codex',
    });
    expect(store.recordAssignment('codex', {
      kind: 'official-default',
    })).toEqual({
      appliedAt: 300,
      managed: true,
      providerId: null,
      runtime: 'codex',
    });
  } finally {
    database.client.close();
  }
});

it('rejects a Provider from another Runtime', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const provider = new DrizzleProviderStore(database.db, () => 100, () => 'provider-id')
    .createProvider(providerInput);

  try {
    expect(() => new DrizzleRuntimeStore(database.db).recordAssignment(
      'claude-code',
      { kind: 'provider', providerId: provider.id },
    )).toThrow(new RuntimeOperationError(
      'PROVIDER_NOT_FOUND',
      'The selected Provider is unavailable.',
    ));
  } finally {
    database.client.close();
  }
});
