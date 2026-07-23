import { rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApplication } from '../../src/application/create-application';
import {
  ensureDatabase,
  ensureStorage,
  ensureStorageRoot,
} from '../../src/storage/ensure-storage';
import { createSqliteStorage } from '../../src/storage/sqlite-storage';
import {
  getDatabasePath,
  getStorageRootPath,
} from '../../src/storage/storage-root';

vi.mock('../../src/storage/storage-root', () => {
  const storageRootPath = path.join(
    os.tmpdir(),
    `foundry-storage-${process.pid}`,
  );

  return {
    databaseFileName: 'foundry.sqlite',
    getDatabasePath: () => path.join(storageRootPath, 'foundry.sqlite'),
    getStorageRootPath: () => storageRootPath,
    storageDirectoryName: '.foundry',
  };
});

const storageRootPath = getStorageRootPath();

describe('storage foundation', () => {
  beforeEach(() => {
    rmSync(storageRootPath, { recursive: true, force: true });
  });

  afterAll(() => {
    rmSync(storageRootPath, { recursive: true, force: true });
  });

  it('creates the storage root and database independently', () => {
    expect(ensureStorageRoot()).toBe(storageRootPath);
    expect(ensureDatabase()).toBe(getDatabasePath());
    expect(statSync(getDatabasePath()).isFile()).toBe(true);
  });

  it('initializes the complete storage path idempotently', () => {
    const first = ensureStorage();
    const second = ensureStorage();

    expect(second).toEqual(first);
  });

  it('commits successful transactions and rolls back failures', () => {
    ensureStorage();
    const storage = createSqliteStorage();

    try {
      storage.database.exec(
        'CREATE TABLE values_table (value TEXT NOT NULL)',
      );

      storage.transaction(() => {
        storage.database
          .prepare('INSERT INTO values_table (value) VALUES (?)')
          .run('committed');
      });

      expect(
        storage.database
          .prepare('SELECT value FROM values_table')
          .all(),
      ).toEqual([{ value: 'committed' }]);

      expect(() => {
        storage.transaction(() => {
          storage.database
            .prepare('INSERT INTO values_table (value) VALUES (?)')
            .run('rolled-back');
          throw new Error('abort transaction');
        });
      }).toThrow('abort transaction');

      expect(
        storage.database
          .prepare('SELECT value FROM values_table')
          .all(),
      ).toEqual([{ value: 'committed' }]);
    } finally {
      storage.close();
    }
  });

  it('checks integrity and closes the application context idempotently', () => {
    const application = createApplication();

    try {
      expect(application.storage.database.isOpen).toBe(true);
      application.storage.assertIntegrity();
      application.close();
      application.close();
      expect(application.storage.database.isOpen).toBe(false);
    } finally {
      application.close();
    }
  });
});
