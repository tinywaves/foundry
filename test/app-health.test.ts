import { expect, it, vi } from 'vitest';
import { checkServiceHealth } from '../app/src/health-client';

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
  });
}

it('reports a connected service from the health envelope', async () => {
  const fetcher = vi.fn(() => Promise.resolve(jsonResponse({
    status: 'SUCCESS',
    data: true,
    message: 'Service is healthy.',
  })));

  await expect(checkServiceHealth(fetcher)).resolves.toEqual({
    state: 'connected',
    message: 'Service is healthy.',
  });
});

it('uses a local message when the optional server message is absent', async () => {
  const fetcher = vi.fn(() => Promise.resolve(jsonResponse({
    status: 'SUCCESS',
    data: true,
  })));

  await expect(checkServiceHealth(fetcher)).resolves.toEqual({
    state: 'connected',
    message: 'Service is healthy.',
  });
});

it.each([
  ['a non-200 response', () => Promise.resolve(jsonResponse({}, 500))],
  ['an invalid envelope', () => Promise.resolve(jsonResponse({ status: 'SUCCESS', data: false }))],
  ['a network failure', () => Promise.reject(new Error('connection refused'))],
])('reports an unavailable service for %s', async (_case, responseFactory) => {
  await expect(checkServiceHealth(vi.fn(responseFactory))).resolves.toEqual({
    state: 'unavailable',
    message: 'Unable to connect to service.',
  });
});
