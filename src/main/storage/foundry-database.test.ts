import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { test } from 'vitest';
import { ProviderRepository } from '../providers/provider-repository';
import { FOUNDRY_SCHEMA_VERSION, openFoundryDatabase } from './foundry-database';
import type { FoundryStorageErrorCode } from './storage-error';
import { FoundryStorageError } from './storage-error';

function createCodexInput() {
  return {
    runtime: 'codex' as const,
    name: 'Migrated Provider',
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'migration-secret',
    remark: 'Keep this row',
    officialWebsite: null,
    modelConfig: { version: 1 as const, defaultModel: 'gpt-default' },
  };
}

function assertStorageError(
  operation: () => unknown,
  code: FoundryStorageErrorCode,
): FoundryStorageError {
  let caught: FoundryStorageError | undefined;
  assert.throws(operation, (error: unknown) => {
    if (!(error instanceof FoundryStorageError)) {
      return false;
    }
    caught = error;
    return error.code === code;
  });
  assert.ok(caught);
  return caught;
}

test('creates the complete Foundry schema in migration order', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    assert.equal(database.pragma('user_version', { simple: true }), FOUNDRY_SCHEMA_VERSION);
    assert.equal(database.pragma('quick_check', { simple: true }), 'ok');
    const tables = database.prepare<[], { name: string }>(`
      SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name
    `).all().map((row) => row.name);
    assert.deepEqual(tables, ['providers', 'runtime_applications']);
  } finally {
    database.close();
  }
});

test('upgrades a version 1 database without changing Provider data', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-upgrade-'));
  const filename = path.join(directory, 'foundry.sqlite');
  try {
    const versionOneDatabase = openFoundryDatabase(filename);
    const created = new ProviderRepository(versionOneDatabase).createProvider(createCodexInput());
    versionOneDatabase.exec('DROP TABLE runtime_applications');
    versionOneDatabase.pragma('user_version = 1');
    versionOneDatabase.close();

    const upgradedDatabase = openFoundryDatabase(filename);
    try {
      assert.equal(
        upgradedDatabase.pragma('user_version', { simple: true }),
        FOUNDRY_SCHEMA_VERSION,
      );
      const row = upgradedDatabase.prepare<[string], {
        api_key: string;
        name: string;
        remark: string;
      }>('SELECT api_key, name, remark FROM providers WHERE id = ?').get(created.id);
      assert.deepEqual(row, {
        api_key: 'migration-secret',
        name: 'Migrated Provider',
        remark: 'Keep this row',
      });
      assert.deepEqual(new ProviderRepository(upgradedDatabase).listProviders('codex'), [
        {
          ...created,
          isInUse: false,
        },
      ]);
    } finally {
      upgradedDatabase.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects future versions and rolls back a blocked migration without changing data', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-version-'));
  const futureFilename = path.join(directory, 'future.sqlite');
  const blockedFilename = path.join(directory, 'blocked.sqlite');
  try {
    const futureDatabase = new Database(futureFilename);
    futureDatabase.exec('CREATE TABLE sentinel (value TEXT NOT NULL); INSERT INTO sentinel VALUES (\'keep\');');
    futureDatabase.pragma(`user_version = ${FOUNDRY_SCHEMA_VERSION + 1}`);
    futureDatabase.close();

    assertStorageError(
      () => openFoundryDatabase(futureFilename),
      'unsupported-database-version',
    );
    const unchangedFutureDatabase = new Database(futureFilename, { readonly: true });
    assert.equal(
      unchangedFutureDatabase.pragma('user_version', { simple: true }),
      FOUNDRY_SCHEMA_VERSION + 1,
    );
    assert.equal(
      unchangedFutureDatabase.prepare('SELECT value FROM sentinel').pluck().get(),
      'keep',
    );
    unchangedFutureDatabase.close();

    const blockedDatabase = new Database(blockedFilename);
    blockedDatabase.exec(
      'CREATE TABLE providers (sentinel TEXT NOT NULL); INSERT INTO providers VALUES (\'keep\');',
    );
    blockedDatabase.close();
    assertStorageError(() => openFoundryDatabase(blockedFilename), 'storage-unavailable');
    const unchangedBlockedDatabase = new Database(blockedFilename, { readonly: true });
    assert.equal(unchangedBlockedDatabase.pragma('user_version', { simple: true }), 0);
    assert.equal(
      unchangedBlockedDatabase.prepare('SELECT sentinel FROM providers').pluck().get(),
      'keep',
    );
    unchangedBlockedDatabase.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('maps unreadable database content to a non-sensitive corruption error', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foundry-storage-corrupt-'));
  const filename = path.join(directory, 'foundry.sqlite');
  try {
    writeFileSync(filename, 'not a sqlite database');
    const error = assertStorageError(() => openFoundryDatabase(filename), 'storage-corrupt');
    assert.equal(error.message.includes('not a sqlite database'), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
