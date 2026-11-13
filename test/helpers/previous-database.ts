import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export function createPreviousDatabase(databasePath: string, schemaVersion: 3 | 4): Database.Database {
  const migrationsFolder = mkdtempSync(path.join(tmpdir(), 'foundry-test-migrations-'));
  const client = new Database(databasePath);
  try {
    cpSync(path.resolve('drizzle'), migrationsFolder, { recursive: true });
    const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: unknown[] };
    journal.entries = journal.entries.slice(0, schemaVersion);
    writeFileSync(journalPath, JSON.stringify(journal));
    migrate(drizzle({ client }), { migrationsFolder });
    client.pragma(`user_version = ${schemaVersion}`);
    return client;
  } catch (error) {
    client.close();
    throw error;
  } finally {
    rmSync(migrationsFolder, { recursive: true, force: true });
  }
}
