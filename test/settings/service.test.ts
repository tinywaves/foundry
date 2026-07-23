import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApplication } from '../../src/application/create-application';
import { getDatabasePath, getStorageRootPath } from '../../src/storage/storage-root';

vi.mock('../../src/storage/storage-root', () => {
  const storageRootPath = path.join(
    os.tmpdir(),
    `foundry-settings-${process.pid}`,
  );

  return {
    databaseFileName: 'foundry.sqlite',
    getDatabasePath: () => path.join(storageRootPath, 'foundry.sqlite'),
    getStorageRootPath: () => storageRootPath,
    storageDirectoryName: '.foundry',
  };
});

const storageRootPath = getStorageRootPath();

describe('settings service', () => {
  beforeEach(() => {
    rmSync(storageRootPath, { recursive: true, force: true });
  });

  afterAll(() => {
    rmSync(storageRootPath, { recursive: true, force: true });
  });

  it('seeds the registered default and returns registry metadata', () => {
    const application = createApplication();

    try {
      expect(application.settingsService.list()).toEqual([
        expect.objectContaining({
          key: 'ui.theme',
          group: 'ui',
          value: 'system',
          valid: true,
          secret: false,
          options: ['system', 'light', 'dark'],
        }),
      ]);
    } finally {
      application.close();
    }
  });

  it('writes valid values and resets them without deleting the row', () => {
    const application = createApplication();

    try {
      const updated = application.settingsService.setMany([{ key: 'ui.theme', value: 'dark' }]);

      expect(updated[0]).toEqual(
        expect.objectContaining({ key: 'ui.theme', value: 'dark', valid: true }),
      );

      const reset = application.settingsService.resetMany(['ui.theme']);

      expect(reset[0]).toEqual(
        expect.objectContaining({
          key: 'ui.theme',
          value: 'system',
          valid: true,
        }),
      );
      expect(
        application.storage.database
          .prepare('SELECT COUNT(*) AS count FROM settings WHERE key = ?')
          .get('ui.theme'),
      ).toEqual({ count: 1 });
    } finally {
      application.close();
    }
  });

  it('repairs missing, unparsable, and malformed payloads with the default', () => {
    const application = createApplication();

    try {
      application.storage.database
        .prepare('DELETE FROM settings WHERE key = ?')
        .run('ui.theme');
      expect(application.settingsService.get('ui.theme').value).toBe('system');

      application.storage.database
        .prepare('UPDATE settings SET payload = ? WHERE key = ?')
        .run('not-json', 'ui.theme');
      expect(application.settingsService.get('ui.theme').value).toBe('system');

      application.storage.database
        .prepare('UPDATE settings SET payload = ? WHERE key = ?')
        .run(JSON.stringify({}), 'ui.theme');
      expect(application.settingsService.get('ui.theme').value).toBe('system');

      expect(
        application.storage.database
          .prepare('SELECT payload FROM settings WHERE key = ?')
          .get('ui.theme'),
      ).toEqual({ payload: JSON.stringify({ value: 'system' }) });
    } finally {
      application.close();
    }
  });

  it('preserves business-invalid values and marks them invalid', () => {
    const application = createApplication();

    try {
      application.storage.database
        .prepare('UPDATE settings SET payload = ? WHERE key = ?')
        .run(JSON.stringify({ value: 'systems' }), 'ui.theme');

      expect(application.settingsService.get('ui.theme')).toEqual(
        expect.objectContaining({
          value: 'systems',
          valid: false,
        }),
      );
      expect(
        application.storage.database
          .prepare('SELECT payload FROM settings WHERE key = ?')
          .get('ui.theme'),
      ).toEqual({ payload: JSON.stringify({ value: 'systems' }) });
    } finally {
      application.close();
    }
  });

  it('rejects invalid batch writes before changing any value', () => {
    const application = createApplication();

    try {
      expect(() =>
        application.settingsService.setMany([
          { key: 'ui.theme', value: 'dark' },
          { key: 'ui.theme', value: 'systems' },
        ]),
      ).toThrow('Invalid value for setting: ui.theme');

      expect(application.settingsService.get('ui.theme').value).toBe('system');
    } finally {
      application.close();
    }
  });

  it('rejects unknown settings', () => {
    const application = createApplication();

    try {
      expect(() => application.settingsService.get('ui.unknown')).toThrow(
        'Unknown setting: ui.unknown',
      );
      expect(() =>
        application.settingsService.resetMany(['ui.unknown']),
      ).toThrow('Unknown setting: ui.unknown');
    } finally {
      application.close();
    }
  });

  it('keeps the configured database inside the storage root', () => {
    expect(getDatabasePath()).toBe(
      path.join(storageRootPath, 'foundry.sqlite'),
    );
  });
});
