import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createFoundryApp } from '../src/server/app';
import type { SettingsStore } from '../src/server/settings-store';

const fixture = { webRoot: '' };

function createTestApp() {
  let colorMode: 'dark' | 'light' | 'system' = 'system';
  const settingsStore: SettingsStore = {
    getApplicationSettings: () => ({ colorMode }),
    updateApplicationSettings: (update) => {
      colorMode = update.colorMode;
      return { colorMode };
    },
  };

  return createFoundryApp({
    settingsStore,
    webRoot: fixture.webRoot,
  });
}

beforeAll(async () => {
  fixture.webRoot = await mkdtemp(path.join(tmpdir(), 'foundry-web-'));
  await writeFile(
    path.join(fixture.webRoot, 'index.html'),
    '<!doctype html><html><head><title>Foundry</title></head><body></body></html>',
  );
});

afterAll(async () => {
  await rm(fixture.webRoot, { recursive: true, force: true });
});

it('serves the Local Web UI from the root route', async () => {
  const response = await createTestApp().request('/');

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
  expect(await response.text()).toContain('<title>Foundry</title>');
});

it('returns the health response envelope', async () => {
  const response = await createTestApp().request('/api/health');

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/json');
  await expect(response.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: true,
    message: 'Service is healthy.',
  });
});

it('returns 400 before the health handler for unexpected parameters', async () => {
  const response = await createTestApp()
    .request('/api/health?unexpected=true');

  expect(response.status).toBe(400);
});

it.each(['/api', '/missing'])('returns 404 for %s', async (requestPath) => {
  const response = await createTestApp().request(requestPath);

  expect(response.status).toBe(404);
});

it('returns the persisted Application Settings', async () => {
  const response = await createTestApp().request('/api/settings');

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: { colorMode: 'system' },
  });
});

it('updates and returns the complete Application Settings', async () => {
  const app = createTestApp();
  const response = await app.request('/api/settings', {
    body: JSON.stringify({ colorMode: 'dark' }),
    headers: { 'content-type': 'application/json' },
    method: 'PATCH',
  });

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: { colorMode: 'dark' },
  });
  const persistedResponse = await app.request('/api/settings');
  await expect(persistedResponse.json()).resolves.toMatchObject({
    data: { colorMode: 'dark' },
  });
});

it.each([
  {},
  { colorMode: 'sepia' },
  { colorMode: 'dark', unexpected: true },
])('rejects an invalid Settings update %#', async (body) => {
  const app = createTestApp();
  const response = await app.request('/api/settings', {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'PATCH',
  });

  expect(response.status).toBe(400);
  const persistedResponse = await app.request('/api/settings');
  await expect(persistedResponse.json()).resolves.toMatchObject({
    data: { colorMode: 'system' },
  });
});

it('rejects unexpected Settings query parameters', async () => {
  const response = await createTestApp().request('/api/settings?unexpected=true');

  expect(response.status).toBe(400);
});
