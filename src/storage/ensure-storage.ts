import { existsSync, mkdirSync } from 'node:fs';
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import { DatabaseSync } from 'node:sqlite';
import { getDatabasePath, getStorageRootPath } from './storage-root';

export type StoragePaths = {
  storageRootPath: string;
  databasePath: string;
};

export function ensureStorageRoot(): string {
  const storageRootPath = getStorageRootPath();

  if (!existsSync(storageRootPath)) {
    mkdirSync(storageRootPath, { recursive: true });
  }

  return storageRootPath;
}

export function ensureDatabase(): string {
  const databasePath = getDatabasePath();

  if (!existsSync(databasePath)) {
    const database = new DatabaseSync(databasePath);
    database.close();
  }

  return databasePath;
}

export function ensureStorage(): StoragePaths {
  const storageRootPath = ensureStorageRoot();
  const databasePath = ensureDatabase();

  return {
    storageRootPath,
    databasePath,
  };
}
