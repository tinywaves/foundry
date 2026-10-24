import Database from 'better-sqlite3';
import { app } from 'electron';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { chmodSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DATABASE_BUSY_TIMEOUT_MS = 5000;
// Increment whenever the persisted SQLite structure changes.
export const CURRENT_DATABASE_SCHEMA_VERSION = 1;

export interface FoundryDatabase {
  client: Database.Database;
  db: ReturnType<typeof drizzle>;
}

export function readDatabaseSchemaVersion(databasePath: string): number {
  const client = new Database(databasePath, {
    fileMustExist: true,
    readonly: true,
  });
  try {
    return Number(client.pragma('user_version', { simple: true }));
  } finally {
    client.close();
  }
}

export function openFoundryDatabase(databasePath: string): FoundryDatabase {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const client = new Database(databasePath, { timeout: DATABASE_BUSY_TIMEOUT_MS });
  if (process.platform !== 'win32') {
    chmodSync(databasePath, 0o600);
  }
  client.pragma('foreign_keys = ON');
  const storedSchemaVersion = Number(client.pragma('user_version', { simple: true }));
  if (storedSchemaVersion > CURRENT_DATABASE_SCHEMA_VERSION) {
    client.close();
    throw new Error('The Foundry database was created by a newer application version');
  }
  const db = drizzle({ client });
  const migrationsRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(app.getAppPath(), 'drizzle');
  try {
    migrate(db, { migrationsFolder: migrationsRoot });
    if (storedSchemaVersion !== CURRENT_DATABASE_SCHEMA_VERSION) {
      client.pragma(`user_version = ${CURRENT_DATABASE_SCHEMA_VERSION}`);
    }
  } catch (error) {
    client.close();
    throw error;
  }
  return { client, db };
}
