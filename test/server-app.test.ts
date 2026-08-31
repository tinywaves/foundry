import { expect, it } from 'vitest';
import { createFoundryApp } from '../src/server/app';

it('serves the Local Web UI from the root route', async () => {
  const response = await createFoundryApp().request('/');

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/html; charset=UTF-8');
  expect(await response.text()).toContain('<title>Foundry</title>');
});

it.each(['/api', '/api/health', '/missing'])('returns 404 for %s', async (path) => {
  const response = await createFoundryApp().request(path);

  expect(response.status).toBe(404);
});
