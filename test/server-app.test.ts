import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type {
  CreateProviderRequest,
  Provider,
  ProviderRuntime,
  RuntimeConfigurationPreview,
} from '@dhzh/foundry-api-contract';
import { createFoundryApp } from '../src/server/app';
import type { ProviderStore } from '../src/server/providers/store';
import type { RuntimeService } from '../src/server/runtimes/service';
import type { SettingsStore } from '../src/server/settings/store';

const fixture = { webRoot: '' };

function createTestApp() {
  let colorMode: 'dark' | 'light' | 'system' = 'system';
  let providerSequence = 0;
  const providers: Provider[] = [];
  const providerStore: ProviderStore = {
    createProvider: (input: CreateProviderRequest) => {
      providerSequence += 1;
      const provider: Provider = {
        ...input,
        createdAt: providerSequence,
        id: `provider-${providerSequence}`,
        updatedAt: providerSequence,
      };
      providers.unshift(provider);
      return provider;
    },
    getProvider: (id: string) => providers.find((provider) => provider.id === id) ?? null,
    listProviders: (runtime: ProviderRuntime) => providers
      .filter((provider) => provider.runtime === runtime),
  };
  const detection = {
    configurationExists: false,
    configurationPath: '/home/user/.codex/config.toml',
    executablePath: '/usr/local/bin/codex',
    message: null,
    status: 'detected',
    version: 'codex-cli 1.0.0',
  } as const;
  const preview = {
    changes: [],
    file: {
      exists: false,
      hash: '0'.repeat(64),
      path: detection.configurationPath,
    },
    kind: 'ready',
    providerKey: null,
    runtime: 'codex',
    target: { kind: 'official-default' },
    unchanged: [],
  } satisfies RuntimeConfigurationPreview;
  const runtimeService: RuntimeService = {
    applyConfiguration: (runtime, input) => Promise.resolve({
      appliedAt: 100,
      detection: {
        ...detection,
        configurationExists: true,
        configurationPath: runtime === 'codex'
          ? detection.configurationPath
          : '/home/user/.claude/settings.json',
      },
      managed: true,
      providerId: input.target.kind === 'provider' ? input.target.providerId : null,
      runtime,
    }),
    listRuntimes: () => Promise.resolve([
      {
        appliedAt: null,
        detection,
        managed: false,
        providerId: null,
        runtime: 'codex',
      },
      {
        appliedAt: null,
        detection: {
          ...detection,
          configurationPath: '/home/user/.claude/settings.json',
          executablePath: null,
          message: 'claude was not found in PATH.',
          status: 'not-detected',
          version: null,
        },
        managed: false,
        providerId: null,
        runtime: 'claude-code',
      },
    ]),
    previewConfiguration: () => Promise.resolve(preview),
  };
  const settingsStore: SettingsStore = {
    getApplicationSettings: () => ({ colorMode }),
    updateApplicationSettings: (update) => {
      colorMode = update.colorMode;
      return { colorMode };
    },
  };

  return createFoundryApp({
    providerStore,
    runtimeService,
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

const codexProviderRequest = {
  avatar: null,
  configuration: {
    apiKey: null,
    baseUrl: 'https://example.com/v1',
    primaryModel: 'example-model',
    protocol: 'responses',
    reviewModel: null,
  },
  name: 'Example',
  officialWebsite: 'https://example.com',
  remark: null,
  runtime: 'codex',
} satisfies CreateProviderRequest;

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

it('creates and lists Providers for the selected Runtime', async () => {
  const app = createTestApp();
  const response = await app.request('/api/providers', {
    body: JSON.stringify(codexProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toMatchObject({
    status: 'SUCCESS',
    data: {
      ...codexProviderRequest,
      id: 'provider-1',
    },
  });

  const codexResponse = await app.request('/api/providers?runtime=codex');
  await expect(codexResponse.json()).resolves.toMatchObject({
    status: 'SUCCESS',
    data: [{ id: 'provider-1', runtime: 'codex' }],
  });

  const claudeResponse = await app.request('/api/providers?runtime=claude-code');
  await expect(claudeResponse.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: [],
  });
});

it('returns complete Claude Code credentials after creation', async () => {
  const app = createTestApp();
  const request = {
    avatar: null,
    configuration: {
      apiKey: 'local-secret',
      apiKeyHeader: 'authorization',
      baseUrl: 'https://gateway.example.com',
      fableModel: null,
      haikuModel: null,
      opusModel: null,
      primaryModel: {
        description: 'Primary model',
        displayName: 'Gateway Sonnet',
        model: 'gateway-sonnet',
        supportedCapabilities: ['thinking', 'effort'],
      },
      protocol: 'messages',
      sonnetModel: null,
      subagentModel: null,
    },
    name: 'Gateway',
    officialWebsite: null,
    remark: 'Local configuration',
    runtime: 'claude-code',
  } satisfies CreateProviderRequest;
  const response = await app.request('/api/providers', {
    body: JSON.stringify(request),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toMatchObject({
    data: {
      configuration: {
        apiKey: 'local-secret',
        apiKeyHeader: 'authorization',
      },
    },
  });
});

it.each([
  ['/api/providers', undefined],
  ['/api/providers?runtime=unknown', undefined],
  ['/api/providers?runtime=codex&unexpected=true', undefined],
])('rejects invalid Provider list input for %s', async (requestPath) => {
  const response = await createTestApp().request(requestPath);

  expect(response.status).toBe(400);
});

it.each([
  {},
  { ...codexProviderRequest, name: '' },
  {
    ...codexProviderRequest,
    configuration: {
      ...codexProviderRequest.configuration,
      baseUrl: 'file:///tmp/provider',
    },
  },
  { ...codexProviderRequest, unexpected: true },
])('rejects invalid Provider creation input %#', async (body) => {
  const response = await createTestApp().request('/api/providers', {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  expect(response.status).toBe(400);
});

it('lists Runtime assignments with detection state', async () => {
  const response = await createTestApp().request('/api/runtimes');

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    status: 'SUCCESS',
    data: [
      { runtime: 'codex', detection: { status: 'detected' } },
      { runtime: 'claude-code', detection: { status: 'not-detected' } },
    ],
  });
});

it('returns Runtime Preview and Apply envelopes', async () => {
  const app = createTestApp();
  const previewResponse = await app.request('/api/runtimes/codex/preview', {
    body: JSON.stringify({ target: { kind: 'official-default' } }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  expect(previewResponse.status).toBe(200);
  await expect(previewResponse.json()).resolves.toMatchObject({
    status: 'SUCCESS',
    data: { kind: 'ready', runtime: 'codex' },
  });

  const applyResponse = await app.request('/api/runtimes/codex/apply', {
    body: JSON.stringify({
      expectedFileHash: '0'.repeat(64),
      target: { kind: 'official-default' },
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  expect(applyResponse.status).toBe(200);
  await expect(applyResponse.json()).resolves.toMatchObject({
    status: 'SUCCESS',
    data: { managed: true, providerId: null, runtime: 'codex' },
  });
});

it.each([
  ['/api/runtimes?unexpected=true', undefined],
  ['/api/runtimes/unknown/preview', { target: { kind: 'official-default' } }],
  ['/api/runtimes/codex/preview', {}],
  [
    '/api/runtimes/codex/apply',
    {
      expectedFileHash: 'invalid',
      target: { kind: 'official-default' },
    },
  ],
])('rejects invalid Runtime input for %s', async (requestPath, body) => {
  const response = await createTestApp().request(requestPath, body === undefined
    ? undefined
    : {
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });

  expect(response.status).toBe(400);
});
