import { homedir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  databaseFileName,
  getDatabasePath,
  getStorageRootPath,
  storageDirectoryName,
} from '../../src/storage/storage-root';

describe('storage root paths', () => {
  it('uses a hidden directory under the user home directory', () => {
    expect(getStorageRootPath()).toBe(
      path.join(homedir(), storageDirectoryName),
    );
  });

  it('keeps the database in the storage root', () => {
    expect(getDatabasePath()).toBe(
      path.join(homedir(), storageDirectoryName, databaseFileName),
    );
  });
});
