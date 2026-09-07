import Database from 'better-sqlite3';
import { randomUUIDv7 } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';

import { openFoundryDatabase } from '../src/server/database';
import { DrizzleSettingsStore } from '../src/server/settings/store';

const temporaryRoots: string[] = [];
const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');

async function createDatabasePath(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'foundry-database-'));
  temporaryRoots.push(root);
  return path.join(root, 'foundry.sqlite');
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })));
});

it('migrates a new database and seeds System Color Mode', async () => {
  const databasePath = await createDatabasePath();
  const database = await openFoundryDatabase({ databasePath, migrationsFolder });

  try {
    expect(new DrizzleSettingsStore(database.db).getApplicationSettings())
      .toEqual({ colorMode: 'system' });

    const row = database.client.prepare(`
      SELECT id, key, value, created_at, updated_at, deleted_at
      FROM settings
    `).get() as Record<string, unknown>;
    expect(row).toMatchObject({
      deleted_at: null,
      key: 'color_mode',
      value: '"system"',
    });
    expect(row.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(row.created_at).toEqual(expect.any(Number));
    expect(row.updated_at).toBe(row.created_at);
    expect(database.client.prepare(`
      SELECT runtime, managed, provider_id, applied_at
      FROM runtimes
      ORDER BY runtime
    `).all()).toEqual([
      {
        applied_at: null,
        managed: 0,
        provider_id: null,
        runtime: 'claude-code',
      },
      {
        applied_at: null,
        managed: 0,
        provider_id: null,
        runtime: 'codex',
      },
    ]);
  } finally {
    database.client.close();
  }
});

it('generates a unique UUIDv7 for each database installation', async () => {
  const firstDatabasePath = await createDatabasePath();
  const secondDatabasePath = await createDatabasePath();
  const firstDatabase = await openFoundryDatabase({
    databasePath: firstDatabasePath,
    migrationsFolder,
  });
  const secondDatabase = await openFoundryDatabase({
    databasePath: secondDatabasePath,
    migrationsFolder,
  });

  try {
    const readId = (database: Database.Database) => database.prepare(`
      SELECT id FROM settings WHERE key = 'color_mode'
    `).pluck().get();
    const firstId = readId(firstDatabase.client);
    const secondId = readId(secondDatabase.client);

    expect(firstId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(secondId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(firstId).not.toBe(secondId);
  } finally {
    firstDatabase.client.close();
    secondDatabase.client.close();
  }
});

it('renames stored Provider default model fields', async () => {
  const databasePath = await createDatabasePath();
  const database = await openFoundryDatabase({ databasePath, migrationsFolder });
  const insertProvider = database.client.prepare(`
    INSERT INTO providers (
      id, runtime, name, configuration, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 100, 100)
  `);

  try {
    insertProvider.run('codex', 'codex', 'Codex', JSON.stringify({
      apiKey: null,
      baseUrl: 'https://codex.example.com/v1',
      primaryModel: 'codex-default',
      protocol: 'responses',
      reviewModel: null,
    }));
    insertProvider.run('claude', 'claude-code', 'Claude Code', JSON.stringify({
      apiKey: 'secret',
      apiKeyHeader: 'authorization',
      baseUrl: 'https://claude.example.com',
      fableModel: null,
      haikuModel: null,
      opusModel: null,
      primaryModel: {
        description: 'Legacy metadata',
        displayName: 'Legacy default',
        model: 'claude-default',
        supportedCapabilities: ['thinking'],
      },
      protocol: 'messages',
      sonnetModel: null,
      subagentModel: null,
      subagentModelForce: false,
    }));

    const migration = await readFile(
      path.join(migrationsFolder, '0003_rename_provider_default_model.sql'),
      'utf8',
    );
    database.client.exec(migration);

    const rows = database.client.prepare(`
      SELECT id, configuration FROM providers ORDER BY id
    `).all() as Array<{ configuration: string; id: string }>;
    const configurations = Object.fromEntries(rows.map((row) => [
      row.id,
      JSON.parse(row.configuration),
    ]));
    expect(configurations.codex).toMatchObject({ defaultModel: 'codex-default' });
    expect(configurations.codex).not.toHaveProperty('primaryModel');
    expect(configurations.claude).toMatchObject({ defaultModel: 'claude-default' });
    expect(configurations.claude).not.toHaveProperty('primaryModel');
  } finally {
    database.client.close();
  }
});

it('persists updates and refreshes updated_at for repeated values', async () => {
  const databasePath = await createDatabasePath();
  const database = await openFoundryDatabase({ databasePath, migrationsFolder });
  const initialUpdatedAt = database.client.prepare(`
    SELECT updated_at FROM settings WHERE key = 'color_mode'
  `).pluck().get() as number;
  const firstWriteTime = initialUpdatedAt + 1;
  const secondWriteTime = firstWriteTime + 1;

  try {
    const firstStore = new DrizzleSettingsStore(database.db, () => firstWriteTime);
    expect(firstStore.updateApplicationSettings({ colorMode: 'dark' }))
      .toEqual({ colorMode: 'dark' });

    const secondStore = new DrizzleSettingsStore(database.db, () => secondWriteTime);
    expect(secondStore.updateApplicationSettings({ colorMode: 'dark' }))
      .toEqual({ colorMode: 'dark' });
    expect(database.client.prepare(`
      SELECT updated_at FROM settings WHERE key = 'color_mode'
    `).pluck().get()).toBe(secondWriteTime);
  } finally {
    database.client.close();
  }

  const reopened = await openFoundryDatabase({ databasePath, migrationsFolder });
  try {
    expect(new DrizzleSettingsStore(reopened.db).getApplicationSettings())
      .toEqual({ colorMode: 'dark' });
  } finally {
    reopened.client.close();
  }
});

it('backs up an existing database without deleting other backup kinds', async () => {
  const databasePath = await createDatabasePath();
  const existing = new Database(databasePath);
  existing.exec('CREATE TABLE preserved (value TEXT NOT NULL)');
  existing.prepare('INSERT INTO preserved (value) VALUES (?)').run('before migration');
  existing.close();

  const backupsDirectory = path.join(path.dirname(databasePath), 'backups');
  const runtimeBackupName = 'foundry-runtime-migration-existing.sqlite';
  await mkdir(backupsDirectory);
  await writeFile(path.join(backupsDirectory, runtimeBackupName), 'unrelated backup');

  const migrated = await openFoundryDatabase({
    databasePath,
    migrationsFolder,
    now: () => Date.UTC(2026, 8, 4),
  });
  migrated.client.close();

  const backupDirectoryEntries = await readdir(backupsDirectory);
  const backupNames = backupDirectoryEntries.toSorted((left, right) =>
    left.localeCompare(right));
  expect(backupNames).toHaveLength(2);
  expect(backupNames).toContain(runtimeBackupName);
  const databaseBackupName = backupNames.find((name) => name.startsWith('foundry-before-'));
  if (!databaseBackupName) {
    throw new Error('Expected a database migration backup.');
  }

  const backup = new Database(path.join(backupsDirectory, databaseBackupName), {
    readonly: true,
  });
  expect(backup.prepare('SELECT value FROM preserved').pluck().get())
    .toBe('before migration');
  backup.close();

  const reopened = await openFoundryDatabase({ databasePath, migrationsFolder });
  reopened.client.close();
  const reopenedBackupNames = await readdir(backupsDirectory);
  expect(reopenedBackupNames.toSorted((left, right) => left.localeCompare(right)))
    .toEqual(backupNames);
});

it('refuses migration history created by a newer CLI', async () => {
  const databasePath = await createDatabasePath();
  const database = await openFoundryDatabase({ databasePath, migrationsFolder });
  database.client.prepare(`
    INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)
  `).run('future', Number.MAX_SAFE_INTEGER);
  database.client.close();

  await expect(
    openFoundryDatabase({ databasePath, migrationsFolder }),
  ).rejects.toThrow('migrated by a newer CLI version');
});

it('rejects unknown or deleted Settings rows', async () => {
  const databasePath = await createDatabasePath();
  const database = await openFoundryDatabase({ databasePath, migrationsFolder });
  const store = new DrizzleSettingsStore(database.db);

  try {
    const now = Date.now();
    database.client.prepare(`
      INSERT INTO settings (
        id, key, value, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, NULL)
    `).run(randomUUIDv7(), 'unknown', 'true', now, now);
    expect(() => store.getApplicationSettings())
      .toThrow('Stored Application Settings are invalid');

    database.client.prepare('DELETE FROM settings WHERE key = \'unknown\'').run();
    database.client.prepare(`
      UPDATE settings SET deleted_at = ? WHERE key = 'color_mode'
    `).run(now);
    expect(() => store.getApplicationSettings())
      .toThrow('Stored Application Settings are invalid');
  } finally {
    database.client.close();
  }
});
