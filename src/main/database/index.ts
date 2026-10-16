import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const DATABASE_BUSY_TIMEOUT_MS = 5000;

export interface FoundryDatabase {
  client: Database.Database;
  db: ReturnType<typeof drizzle>;
}

export function openFoundryDatabase(databasePath: string): FoundryDatabase {
  mkdirSync(path.dirname(databasePath), { recursive: true });

  const client = new Database(databasePath, {
    timeout: DATABASE_BUSY_TIMEOUT_MS,
  });

  client.pragma('foreign_keys = ON');

  return {
    client,
    db: drizzle({ client }),
  };
}
