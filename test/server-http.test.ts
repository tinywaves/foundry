import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { createApp } from '../src/server/app';
import { createApiApp } from '../src/server/api';
import { openFoundryDatabase } from '../src/storage/database';

const { join } = path;

it('uses JSON error envelopes for API routes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-api-errors-'));
  const database = openFoundryDatabase(join(directory, 'foundry.sqlite'));
  const app = createApiApp(database);

  try {
    const missingResponse = await app.request('/api/missing');
    expect(missingResponse.status).toBe(404);
    expect(missingResponse.headers.get('content-type')).toContain('application/json');
    expect(await missingResponse.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'API route not found',
      },
    });

    const htmlMissingResponse = await app.request('/api/missing', {
      headers: { accept: 'text/html' },
    });
    expect(htmlMissingResponse.status).toBe(404);
    expect(htmlMissingResponse.headers.get('content-type')).toContain('application/json');

    const settingsParent = join(directory, 'not-a-directory');
    await writeFile(settingsParent, 'blocked');
    const failingApp = createApiApp(database, {
      settingsPath: join(settingsParent, 'settings.json'),
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const errorResponse = await failingApp.request('/api/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      });
      expect(errorResponse.status).toBe(500);
      expect(errorResponse.headers.get('content-type')).toContain('application/json');
      expect(await errorResponse.json()).toEqual({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      });
    } finally {
      consoleError.mockRestore();
    }
  } finally {
    database.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('serves the SPA only for navigation requests', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-static-'));
  const webRoot = join(directory, 'web');
  const database = openFoundryDatabase(join(directory, 'foundry.sqlite'));
  await mkdir(join(webRoot, 'assets'), { recursive: true });
  await writeFile(join(webRoot, 'index.html'), '<!doctype html><title>Foundry</title>');
  await writeFile(join(webRoot, 'assets', 'existing.js'), 'console.log("ok")');
  const app = createApp(webRoot, database);

  try {
    const rootResponse = await app.request('/');
    expect(rootResponse.status).toBe(200);
    expect(await rootResponse.text()).toContain('<title>Foundry</title>');

    const apiMissingResponse = await app.request('/api/missing', {
      headers: { accept: 'text/html' },
    });
    expect(apiMissingResponse.status).toBe(404);
    expect(apiMissingResponse.headers.get('content-type')).toContain('application/json');

    const navigationResponse = await app.request('/captures/example', {
      headers: { accept: 'text/html' },
    });
    expect(navigationResponse.status).toBe(200);
    expect(await navigationResponse.text()).toContain('<title>Foundry</title>');

    const missingAssetResponse = await app.request('/assets/missing.js', {
      headers: { accept: 'text/html' },
    });
    expect(missingAssetResponse.status).toBe(404);
    expect(missingAssetResponse.headers.get('content-type')).not.toContain('text/html');

    const nonNavigationResponse = await app.request('/captures/example', {
      headers: { accept: 'application/json' },
    });
    expect(nonNavigationResponse.status).toBe(404);

    const existingAssetResponse = await app.request('/assets/existing.js');
    expect(existingAssetResponse.status).toBe(200);
    expect(await existingAssetResponse.text()).toBe('console.log("ok")');
  } finally {
    database.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
