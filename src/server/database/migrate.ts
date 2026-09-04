import type Database from 'better-sqlite3';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const MIGRATIONS_TABLE = '__drizzle_migrations';

interface AppliedMigrationRow {
  created_at: number;
  hash: string;
}

interface MigrateFoundryDatabaseOptions {
  isExistingDatabase: boolean;
  databasePath: string;
  migrationsFolder: string;
  now?: () => number;
}

function hasMigrationsTable(database: Database.Database): boolean {
  return Boolean(database.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).pluck().get(MIGRATIONS_TABLE));
}

function readAppliedMigrations(database: Database.Database): AppliedMigrationRow[] {
  if (!hasMigrationsTable(database)) {
    return [];
  }

  return database.prepare<[], AppliedMigrationRow>(`
    SELECT hash, created_at
    FROM ${MIGRATIONS_TABLE}
    ORDER BY created_at ASC
  `).all();
}

function assertCompatibleHistory(
  applied: AppliedMigrationRow[],
  bundled: ReturnType<typeof readMigrationFiles>,
): void {
  if (applied.length > bundled.length) {
    throw new Error('The Foundry database was migrated by a newer CLI version.');
  }

  for (const [index, migration] of applied.entries()) {
    const expected = bundled[index];
    if (
      migration.hash !== expected.hash
      || migration.created_at !== expected.folderMillis
    ) {
      throw new Error('The Foundry database migration history is incompatible.');
    }
  }
}

async function retainNewestBackup(backupsDirectory: string): Promise<void> {
  const directoryEntries = await readdir(backupsDirectory);
  const backupNames = directoryEntries
    .filter((name) => name.endsWith('.sqlite'))
    .toSorted((left, right) => left.localeCompare(right));
  const staleBackupNames = backupNames.slice(0, -1);

  await Promise.all(staleBackupNames.map((name) =>
    rm(path.join(backupsDirectory, name), { force: true })));
}

async function backupDatabase(
  database: Database.Database,
  databasePath: string,
  now: () => number,
): Promise<void> {
  const backupsDirectory = path.join(path.dirname(databasePath), 'backups');
  await mkdir(backupsDirectory, { recursive: true });

  const timestamp = new Date(now()).toISOString().replaceAll(':', '-');
  const backupPath = path.join(
    backupsDirectory,
    `foundry-before-${timestamp}-${process.pid}.sqlite`,
  );
  await database.backup(backupPath);
  await retainNewestBackup(backupsDirectory);
}

function applyPendingMigrations(
  database: Database.Database,
  bundled: ReturnType<typeof readMigrationFiles>,
): void {
  database.exec('BEGIN IMMEDIATE');
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    const applied = readAppliedMigrations(database);
    assertCompatibleHistory(applied, bundled);

    const insertMigration = database.prepare(`
      INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at)
      VALUES (?, ?)
    `);

    for (const migration of bundled.slice(applied.length)) {
      for (const statement of migration.sql) {
        database.exec(statement);
      }
      insertMigration.run(migration.hash, migration.folderMillis);
    }

    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export async function migrateFoundryDatabase(
  database: Database.Database,
  options: MigrateFoundryDatabaseOptions,
): Promise<void> {
  const bundled = readMigrationFiles({ migrationsFolder: options.migrationsFolder });
  const applied = readAppliedMigrations(database);
  assertCompatibleHistory(applied, bundled);

  if (applied.length === bundled.length) {
    return;
  }

  if (options.isExistingDatabase) {
    await backupDatabase(database, options.databasePath, options.now ?? Date.now);
  }

  applyPendingMigrations(database, bundled);
}
