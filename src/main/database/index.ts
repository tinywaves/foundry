import Database from 'better-sqlite3';
import { app } from 'electron';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DATABASE_BUSY_TIMEOUT_MS = 5000;

export interface FoundryDatabase {
  client: Database.Database;
  db: ReturnType<typeof drizzle>;
}

export function openFoundryDatabase(databasePath: string): FoundryDatabase {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const client = new Database(databasePath, { timeout: DATABASE_BUSY_TIMEOUT_MS });
  client.pragma('foreign_keys = ON');
  const db = drizzle({ client });
  const migrationsRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(app.getAppPath(), 'drizzle');
  migrate(db, { migrationsFolder: migrationsRoot });
  return { client, db };
}
