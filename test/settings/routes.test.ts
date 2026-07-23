import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApplication } from '../../src/application/create-application';
import { createSettingsApi } from '../../src/modules/settings/routes';
import { getStorageRootPath } from '../../src/storage/storage-root';

vi.mock('../../src/storage/storage-root', () => {
  const storageRootPath = path.join(
    os.tmpdir(),
    `foundry-settings-routes-${process.pid}`,
  );

  return {
    databaseFileName: 'foundry.sqlite',
    getDatabasePath: () => path.join(storageRootPath, 'foundry.sqlite'),
    getStorageRootPath: () => storageRootPath,
    storageDirectoryName: '.foundry',
  };
});

const storageRootPath = getStorageRootPath();

describe('settings API', () => {
  beforeEach(() => {
    rmSync(storageRootPath, { recursive: true, force: true });
  });

  afterAll(() => {
    rmSync(storageRootPath, { recursive: true, force: true });
  });

  it('gets the full settings list', async () => {
    const application = createApplication();

    try {
      const api = createSettingsApi(application.settingsService);
      const response = await api.request('/api/settings');

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([
        expect.objectContaining({
          key: 'ui.theme',
          value: 'system',
          valid: true,
        }),
      ]);
    } finally {
      application.close();
    }
  });

  it('updates only the submitted settings', async () => {
    const application = createApplication();

    try {
      const api = createSettingsApi(application.settingsService);
      const response = await api.request('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([{ key: 'ui.theme', value: 'dark' }]),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        [expect.objectContaining({ key: 'ui.theme', value: 'dark' })],
      );
    } finally {
      application.close();
    }
  });

  it('resets the requested settings', async () => {
    const application = createApplication();

    try {
      application.settingsService.setMany([{ key: 'ui.theme', value: 'dark' }]);
      const api = createSettingsApi(application.settingsService);
      const response = await api.request('/api/settings/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keys: ['ui.theme'] }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(
        [expect.objectContaining({ key: 'ui.theme', value: 'system' })],
      );
    } finally {
      application.close();
    }
  });
});
