import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ProviderConnectionRequest } from './provider-connection-tester';
import {
  PROVIDER_CONNECTION_TIMEOUT_MS,
  ProviderConnectionTester,
} from './provider-connection-tester';

test('builds an authenticated Codex models request and accepts 2xx responses', async () => {
  assert.equal(PROVIDER_CONNECTION_TIMEOUT_MS, 15_000);
  let requestedUrl: string | undefined;
  let requestInit: Parameters<ProviderConnectionRequest>[1] | undefined;
  const tester = new ProviderConnectionTester((url, init) => {
    requestedUrl = url;
    requestInit = init;
    return Promise.resolve({ status: 204, statusText: 'No Content' });
  }, PROVIDER_CONNECTION_TIMEOUT_MS, () => 1234);

  const summary = await tester.test({
    runtime: 'codex',
    baseUrl: 'https://api.example.com/v1/',
    apiKey: ' secret-key ',
  });

  assert.equal(requestedUrl, 'https://api.example.com/v1/models');
  assert.ok(requestInit);
  assert.equal(requestInit.method, 'GET');
  assert.equal(requestInit.redirect, 'manual');
  assert.deepEqual(requestInit.headers, { Authorization: 'Bearer  secret-key ' });
  assert.deepEqual(summary, { status: 'connected', lastTestedAt: 1234, lastError: null });
});

test('builds Claude Code paths and omits a missing API-key header', async () => {
  const requests: Array<{ url: string; headers: Record<string, string> }> = [];
  const tester = new ProviderConnectionTester((url, init) => {
    requests.push({ url, headers: init.headers });
    return Promise.resolve({ status: 200, statusText: 'OK' });
  });

  await tester.test({
    runtime: 'claude-code',
    baseUrl: 'https://claude.example.com/custom',
    apiKey: 'claude-key',
  });
  await tester.test({
    runtime: 'claude-code',
    baseUrl: 'https://claude.example.com/v1/',
    apiKey: null,
  });

  assert.deepEqual(requests, [
    {
      url: 'https://claude.example.com/custom/v1/models',
      headers: { 'anthropic-version': '2023-06-01', 'x-api-key': 'claude-key' },
    },
    {
      url: 'https://claude.example.com/v1/models',
      headers: { 'anthropic-version': '2023-06-01' },
    },
  ]);
});

test('returns bounded sanitized HTTP and redirect failures without response bodies', async () => {
  const responses = [
    { status: 302, statusText: 'Found' },
    { status: 401, statusText: `Unauthorized\r\n${'x'.repeat(300)}` },
  ];
  const tester = new ProviderConnectionTester(() => Promise.resolve(
    responses.shift() ?? { status: 500, statusText: '' },
  ), PROVIDER_CONNECTION_TIMEOUT_MS, () => 5678);
  const input = { runtime: 'codex' as const, baseUrl: 'https://api.example.com/v1', apiKey: null };

  const redirect = await tester.test(input);
  const unauthorized = await tester.test(input);

  assert.deepEqual(redirect, {
    status: 'failed',
    lastTestedAt: 5678,
    lastError: 'Redirect responses are not allowed.',
  });
  assert.equal(unauthorized.status, 'failed');
  assert.ok(unauthorized.lastError);
  assert.equal(unauthorized.lastError.startsWith('HTTP 401 Unauthorized '), true);
  assert.equal(unauthorized.lastError.includes('\r'), false);
  assert.equal(unauthorized.lastError.includes('\n'), false);
  assert.equal(unauthorized.lastError.length, 160);
});

test('distinguishes timeouts from generic network or TLS failures', async () => {
  const timeoutTester = new ProviderConnectionTester((_, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('secret timeout detail')));
  }), 1, () => 9012);
  const networkTester = new ProviderConnectionTester(
    () => Promise.reject(new Error('secret network detail')),
    PROVIDER_CONNECTION_TIMEOUT_MS,
    () => 9013,
  );
  const input = { runtime: 'codex' as const, baseUrl: 'https://api.example.com/v1', apiKey: null };

  const timeout = await timeoutTester.test(input);
  const network = await networkTester.test(input);

  assert.equal(timeout.lastError, 'Connection timed out after 0.001 seconds.');
  assert.deepEqual(network, {
    status: 'failed',
    lastTestedAt: 9013,
    lastError: 'Network or TLS connection failed.',
  });
});
