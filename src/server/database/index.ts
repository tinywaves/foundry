import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { randomUUIDv7 } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { migrateFoundryDatabase } from './migrate';
import { getFoundryDatabasePath } from './paths';
import * as schema from './schema';

const DATABASE_BUSY_TIMEOUT_MS = 5000;

export interface FoundryDatabase {
  client: Database.Database;
  db: ReturnType<typeof drizzle<typeof schema>>;
}

export interface OpenFoundryDatabaseOptions {
  databasePath?: string;
  migrationsFolder?: string;
  now?: () => number;
}

function findMigrationsFolder(): string {
  const candidates = [
    path.resolve(import.meta.dirname, 'migrations'),
    path.resolve(import.meta.dirname, '../../../drizzle'),
  ];
  const migrationsFolder = candidates.find((candidate) => existsSync(candidate));

  if (!migrationsFolder) {
    throw new Error('Foundry database migrations could not be found.');
  }

  return migrationsFolder;
}

export async function openFoundryDatabase(
  options: OpenFoundryDatabaseOptions = {},
): Promise<FoundryDatabase> {
  const databasePath = options.databasePath ?? getFoundryDatabasePath();
  const isExistingDatabase = existsSync(databasePath);
  await mkdir(path.dirname(databasePath), { recursive: true });

  const client = new Database(databasePath, { timeout: DATABASE_BUSY_TIMEOUT_MS });
  try {
    client.pragma('foreign_keys = ON');
    client.function('uuid_v7', () => randomUUIDv7());
    await migrateFoundryDatabase(client, {
      isExistingDatabase,
      databasePath,
      migrationsFolder: options.migrationsFolder ?? findMigrationsFolder(),
      now: options.now,
    });

    return {
      client,
      db: drizzle({ client, schema }),
    };
  } catch (error) {
    client.close();
    throw error;
  }
}
