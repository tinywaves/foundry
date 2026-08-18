import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SkillOperationError } from './skill-error';
import { SkillProviderHttpClient } from './skill-provider-http-client';

const allowedHosts = new Set(['provider.example']);

test('caches successful bounded JSON reads for the configured TTL', async () => {
  let now = 10;
  let requests = 0;
  const client = new SkillProviderHttpClient({
    now: () => now,
    fetch: () => {
      requests += 1;
      return Promise.resolve(Response.json({ request: requests }));
    },
    policy: { cacheTtlMs: 10 },
  });

  const request = { url: 'https://provider.example/search', allowedHosts };
  assert.deepEqual(await client.getJson(request), { request: 1 });
  assert.deepEqual(await client.getJson(request), { request: 1 });
  assert.equal(requests, 1);

  now = 20;
  assert.deepEqual(await client.getJson(request), { request: 2 });
  assert.equal(requests, 2);
});

test('bounds redirects, hosts, and response bytes', async () => {
  const redirectClient = new SkillProviderHttpClient({
    fetch: () => Promise.resolve(new Response(null, {
      status: 302,
      headers: { Location: 'https://untrusted.example/data' },
    })),
  });
  await assertSkillError(
    () => redirectClient.getJson({ url: 'https://provider.example/data', allowedHosts }),
    'source-unavailable',
  );

  const oversizedClient = new SkillProviderHttpClient({
    fetch: () => Promise.resolve(Response.json({ value: 'too large' })),
    policy: { maxResponseBytes: 8 },
  });
  await assertSkillError(
    () => oversizedClient.getJson({ url: 'https://provider.example/data', allowedHosts }),
    'resource-limit',
  );
});

test('normalizes rate limits without exposing response bodies', async () => {
  let wasBodyCanceled = false;
  const body = new ReadableStream<Uint8Array>({
    cancel: () => {
      wasBodyCanceled = true;
    },
    start: (controller) => controller.enqueue(new TextEncoder().encode(
      'sensitive provider details',
    )),
  });
  const client = new SkillProviderHttpClient({
    fetch: () => Promise.resolve(new Response(body, {
      status: 429,
      headers: { 'Retry-After': '17' },
    })),
  });
  await assert.rejects(
    () => client.getJson({ url: 'https://provider.example/data', allowedHosts }),
    (error: unknown) => {
      assert.ok(error instanceof SkillOperationError);
      assert.equal(error.code, 'rate-limited');
      assert.equal(error.retryAfterSeconds, 17);
      assert.equal(error.message.includes('sensitive'), false);
      return true;
    },
  );
  assert.equal(wasBodyCanceled, true);
});

test('distinguishes JSON handoffs from binary artifacts without reading artifact bytes', async () => {
  let wasBinaryCanceled = false;
  const binaryBody = new ReadableStream<Uint8Array>({
    cancel: () => {
      wasBinaryCanceled = true;
    },
  });
  const responses = [
    Response.json({ sourceRef: 'public-github' }),
    new Response(binaryBody, { headers: { 'Content-Type': 'application/zip' } }),
  ];
  const client = new SkillProviderHttpClient({
    fetch: () => Promise.resolve(responses.shift() ?? Response.error()),
  });

  assert.deepEqual(await client.inspectJsonOrBinary({
    url: 'https://provider.example/download',
    allowedHosts,
  }), {
    kind: 'json',
    value: { sourceRef: 'public-github' },
  });
  assert.deepEqual(await client.inspectJsonOrBinary({
    url: 'https://provider.example/download',
    allowedHosts,
  }), {
    kind: 'binary',
    contentType: 'application/zip',
  });
  assert.equal(wasBinaryCanceled, true);
});

async function assertSkillError(
  operation: () => Promise<unknown>,
  code: SkillOperationError['code'],
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => (
    error instanceof SkillOperationError && error.code === code
  ));
}
