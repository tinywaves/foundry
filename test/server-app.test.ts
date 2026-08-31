import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createFoundryApp } from '../src/server/app';

const fixture = { webRoot: '' };

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
  const response = await createFoundryApp({ webRoot: fixture.webRoot }).request('/');

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
  expect(await response.text()).toContain('<title>Foundry</title>');
});

it('returns the health response envelope', async () => {
  const response = await createFoundryApp({ webRoot: fixture.webRoot }).request('/api/health');

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/json');
  await expect(response.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: true,
    message: 'Service is healthy.',
  });
});

it('returns 400 before the health handler for unexpected parameters', async () => {
  const response = await createFoundryApp({ webRoot: fixture.webRoot })
    .request('/api/health?unexpected=true');

  expect(response.status).toBe(400);
});

it.each(['/api', '/missing'])('returns 404 for %s', async (requestPath) => {
  const response = await createFoundryApp({ webRoot: fixture.webRoot }).request(requestPath);

  expect(response.status).toBe(404);
});
