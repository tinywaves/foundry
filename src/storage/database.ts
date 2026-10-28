import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { ensureFoundryHome, getFoundryDatabasePath } from './paths';

const DATABASE_BUSY_TIMEOUT_MS = 5000;
// Increment whenever the persisted SQLite structure changes.
export const CURRENT_DATABASE_SCHEMA_VERSION = 1;

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

export interface FoundryDatabase {
  client: Database.Database;
  db: ReturnType<typeof drizzle>;
  path: string;
  schemaVersion: number;
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

export function openFoundryDatabase(
  databasePath = getFoundryDatabasePath(),
  migrationsRoot = resolveMigrationsRoot(),
): FoundryDatabase {
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

  try {
    migrate(db, { migrationsFolder: migrationsRoot });

    if (storedSchemaVersion !== CURRENT_DATABASE_SCHEMA_VERSION) {
      client.pragma(`user_version = ${CURRENT_DATABASE_SCHEMA_VERSION}`);
    }
  } catch (error) {
    client.close();
    throw error;
  }

  return {
    client,
    db,
    path: databasePath,
    schemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
  };
}

export function initializeFoundryStorage(): FoundryDatabase {
  ensureFoundryHome();
  return openFoundryDatabase();
}

function resolveMigrationsRoot(): string {
  const candidates = [
    path.resolve(moduleDirectory, 'drizzle'),
    path.resolve(moduleDirectory, '../../drizzle'),
    path.resolve(process.cwd(), 'drizzle'),
  ];
  const migrationsRoot = candidates.find((candidate) =>
    existsSync(path.join(candidate, 'meta', '_journal.json')),
  );

  if (!migrationsRoot) {
    throw new Error('Foundry database migrations were not found');
  }

  return migrationsRoot;
}
