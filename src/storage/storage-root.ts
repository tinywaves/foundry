import { homedir } from 'node:os';
import path from 'node:path';

export const storageDirectoryName = '.foundry';
export const databaseFileName = 'foundry.sqlite';

export function getStorageRootPath(): string {
  return path.join(homedir(), storageDirectoryName);
}

export function getDatabasePath(): string {
  return path.join(getStorageRootPath(), databaseFileName);
}
