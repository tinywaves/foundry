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
import type {
  ProviderConnectionTester,
  ProviderConnectionTestResult,
} from '../src/server/providers/connection-tester';
import type { ProviderStore } from '../src/server/providers/store';
import type { RuntimeService } from '../src/server/runtimes/service';
import type { SettingsStore } from '../src/server/settings/store';

const fixture = { webRoot: '' };

function createTestApp(options: {
  connectionTestResult?: ProviderConnectionTestResult;
  inUseProviderId?: string;
} = {}) {
  let colorMode: 'dark' | 'light' | 'system' = 'system';
  let providerSequence = 0;
  const providers: Provider[] = [];
  const providerStore: ProviderStore = {
    copyProvider: (id: string, input: CreateProviderRequest) => {
      const existing = providers.find((provider) => provider.id === id);
      if (!existing) {
        return null;
      }
      if (input.runtime !== existing.runtime) {
        throw new Error('A Provider Runtime cannot be changed.');
      }
      return providerStore.createProvider(input);
    },
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
    createProviders: (inputs) => inputs.map((input) =>
      providerStore.createProvider(input)),
    deleteProvider: (id: string) => {
      const index = providers.findIndex((provider) => provider.id === id);
      if (index === -1) {
        return 'not-found';
      }
      if (options.inUseProviderId === id) {
        return 'in-use';
      }
      providers.splice(index, 1);
      return 'deleted';
    },
    getProvider: (id: string) => providers.find((provider) => provider.id === id) ?? null,
    listProviders: (runtime: ProviderRuntime) => providers
      .filter((provider) => provider.runtime === runtime),
    updateProvider: (id: string, input: CreateProviderRequest) => {
      const index = providers.findIndex((provider) => provider.id === id);
      if (index === -1) {
        return null;
      }
      const existing = providers[index];
      if (input.runtime !== existing.runtime) {
        throw new Error('A Provider Runtime cannot be changed.');
      }

      const updated: Provider = {
        ...input,
        createdAt: existing.createdAt,
        id: existing.id,
        updatedAt: existing.updatedAt + 1,
      };
      providers[index] = updated;
      return updated;
    },
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
  const providerConnectionTester: ProviderConnectionTester = {
    testProvider: () => Promise.resolve(
      options.connectionTestResult ?? { successful: true },
    ),
  };

  return createFoundryApp({
    providerConnectionTester,
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
    defaultModel: 'example-model',
    protocol: 'responses',
    reviewModel: null,
  },
  name: 'Example',
  officialWebsite: 'https://example.com',
  remark: null,
  runtime: 'codex',
} satisfies CreateProviderRequest;

const claudeProviderRequest = {
  avatar: null,
  configuration: {
    apiKey: 'claude-secret',
    apiKeyHeader: 'authorization',
    baseUrl: 'https://claude.example.com',
    fableModel: null,
    haikuModel: null,
    opusModel: null,
    defaultModel: 'claude-model',
    protocol: 'messages',
    sonnetModel: null,
    subagentModel: null,
    subagentModelForce: false,
    hideAiAttribution: false,
    teammatesMode: false,
    enableToolSearch: false,
    maxEffortThinking: false,
    disableAutoUpdater: false,
  },
  name: 'Claude',
  officialWebsite: null,
  remark: null,
  runtime: 'claude-code',
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

it('downloads the complete Foundry Export as a no-store attachment', async () => {
  const app = createTestApp();
  await app.request('/api/providers', {
    body: JSON.stringify(codexProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  await app.request('/api/providers', {
    body: JSON.stringify(claudeProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  const response = await app.request('/api/data/export');
  const content = new Uint8Array(await response.arrayBuffer());

  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('content-disposition'))
    .toMatch(/^attachment; filename="foundry-export-\d{4}-\d{2}-\d{2}T\d{6}\.foundry"$/u);
  expect(response.headers.get('content-type')).toBe('application/octet-stream');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  expect(Number(response.headers.get('content-length'))).toBe(content.byteLength);
  expect(content.slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4B]));
});

it('rejects unexpected Foundry Export query parameters', async () => {
  const response = await createTestApp().request('/api/data/export?unexpected=true');

  expect(response.status).toBe(400);
});

it('imports a Foundry Export and returns each module result', async () => {
  const app = createTestApp();
  await app.request('/api/providers', {
    body: JSON.stringify(codexProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const exportResponse = await app.request('/api/data/export');
  const exported = await exportResponse.arrayBuffer();
  await app.request('/api/settings', {
    body: JSON.stringify({ colorMode: 'dark' }),
    headers: { 'content-type': 'application/json' },
    method: 'PATCH',
  });

  const response = await app.request('/api/data/import', {
    body: exported,
    headers: { 'content-type': 'application/octet-stream' },
    method: 'POST',
  });

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: {
      modules: [
        { id: 'settings', importedItems: 1, status: 'imported' },
        { id: 'providers', importedItems: 1, status: 'imported' },
      ],
    },
  });
  const settingsResponse = await app.request('/api/settings');
  const providersResponse = await app.request('/api/providers?runtime=codex');
  await expect(settingsResponse.json()).resolves.toMatchObject({
    data: { colorMode: 'system' },
  });
  await expect(providersResponse.json())
    .resolves
    .toMatchObject({ data: [{ name: 'Example' }, { name: 'Example' }] });
});

it('rejects invalid Foundry Import files and unexpected query parameters', async () => {
  const app = createTestApp();
  const invalidFileResponse = await app.request('/api/data/import', {
    body: new Uint8Array([1, 2, 3]),
    method: 'POST',
  });
  const invalidQueryResponse = await app.request('/api/data/import?unexpected=true', {
    body: new Uint8Array([1, 2, 3]),
    method: 'POST',
  });

  expect(invalidFileResponse.status).toBe(400);
  expect(invalidQueryResponse.status).toBe(400);
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
  await expect(response.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: {
      avatar: null,
      baseUrl: 'https://example.com/v1',
      id: 'provider-1',
      name: 'Example',
      officialWebsite: 'https://example.com',
      remark: null,
      runtime: 'codex',
    },
  });

  const codexResponse = await app.request('/api/providers?runtime=codex');
  await expect(codexResponse.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: [
      {
        avatar: null,
        baseUrl: 'https://example.com/v1',
        id: 'provider-1',
        name: 'Example',
        officialWebsite: 'https://example.com',
        remark: null,
        runtime: 'codex',
      },
    ],
  });

  const claudeResponse = await app.request('/api/providers?runtime=claude-code');
  await expect(claudeResponse.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: [],
  });
});

it('deletes an available Provider', async () => {
  const app = createTestApp();
  await app.request('/api/providers', {
    body: JSON.stringify(codexProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  const response = await app.request('/api/providers/provider-1', {
    method: 'DELETE',
  });

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: true,
  });
  const listResponse = await app.request('/api/providers?runtime=codex');
  await expect(listResponse.json()).resolves.toMatchObject({ data: [] });
});

it('returns business errors when a Provider cannot be deleted', async () => {
  const missingResponse = await createTestApp().request(
    '/api/providers/missing',
    { method: 'DELETE' },
  );
  expect(missingResponse.status).toBe(200);
  await expect(missingResponse.json()).resolves.toMatchObject({
    status: 'PROVIDER_NOT_FOUND',
    data: false,
  });

  const app = createTestApp({ inUseProviderId: 'provider-1' });
  await app.request('/api/providers', {
    body: JSON.stringify(codexProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const inUseResponse = await app.request('/api/providers/provider-1', {
    method: 'DELETE',
  });
  expect(inUseResponse.status).toBe(200);
  await expect(inUseResponse.json()).resolves.toMatchObject({
    status: 'PROVIDER_IN_USE',
    data: false,
  });
  const listResponse = await app.request('/api/providers?runtime=codex');
  await expect(listResponse.json()).resolves.toMatchObject({
    data: [expect.objectContaining({ id: 'provider-1' })],
  });
});

it('does not return Claude Code credentials after creation', async () => {
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
      defaultModel: 'gateway-sonnet',
      protocol: 'messages',
      sonnetModel: null,
      subagentModel: null,
      subagentModelForce: false,
      hideAiAttribution: true,
      teammatesMode: true,
      enableToolSearch: true,
      maxEffortThinking: true,
      disableAutoUpdater: true,
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
  await expect(response.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: {
      avatar: null,
      baseUrl: 'https://gateway.example.com',
      id: 'provider-1',
      name: 'Gateway',
      officialWebsite: null,
      remark: 'Local configuration',
      runtime: 'claude-code',
    },
  });
});

it('returns complete Provider details for local editing', async () => {
  const app = createTestApp();
  await app.request('/api/providers', {
    body: JSON.stringify({
      ...codexProviderRequest,
      configuration: { ...codexProviderRequest.configuration, apiKey: 'saved-secret' },
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  const response = await app.request('/api/providers/provider-1');

  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result).toEqual({
    status: 'SUCCESS',
    data: {
      avatar: null,
      configuration: {
        apiKey: 'saved-secret',
        baseUrl: 'https://example.com/v1',
        defaultModel: 'example-model',
        protocol: 'responses',
        reviewModel: null,
      },
      createdAt: 1,
      id: 'provider-1',
      name: 'Example',
      officialWebsite: 'https://example.com',
      remark: null,
      runtime: 'codex',
      updatedAt: 1,
    },
  });
});

it('tests a saved Provider connection', async () => {
  const app = createTestApp();
  await app.request('/api/providers', {
    body: JSON.stringify(codexProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  const response = await app.request(
    '/api/providers/provider-1/test-connection',
    { method: 'POST' },
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    status: 'SUCCESS',
    data: true,
  });
});

it('returns a business failure when a Provider connection test fails', async () => {
  const app = createTestApp({
    connectionTestResult: {
      message: 'Authentication failed.',
      successful: false,
    },
  });
  await app.request('/api/providers', {
    body: JSON.stringify(codexProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  const response = await app.request(
    '/api/providers/provider-1/test-connection',
    { method: 'POST' },
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    status: 'PROVIDER_CONNECTION_FAILED',
    data: false,
    message: 'Authentication failed.',
  });
});

it('does not test a missing Provider connection', async () => {
  const response = await createTestApp().request(
    '/api/providers/missing/test-connection',
    { method: 'POST' },
  );

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    status: 'PROVIDER_NOT_FOUND',
    data: false,
  });
});

it('updates a Provider with its complete configuration', async () => {
  const app = createTestApp();
  await app.request('/api/providers', {
    body: JSON.stringify({
      ...codexProviderRequest,
      configuration: { ...codexProviderRequest.configuration, apiKey: 'saved-secret' },
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const response = await app.request('/api/providers/provider-1', {
    body: JSON.stringify({
      ...codexProviderRequest,
      configuration: {
        ...codexProviderRequest.configuration,
        apiKey: 'saved-secret',
        baseUrl: 'https://updated.example.com/v1',
      },
      name: 'Updated Provider',
    } satisfies CreateProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  });

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    status: 'SUCCESS',
    data: {
      baseUrl: 'https://updated.example.com/v1',
      id: 'provider-1',
      name: 'Updated Provider',
    },
  });
  const detailResponse = await app.request('/api/providers/provider-1');
  await expect(detailResponse.json()).resolves.toMatchObject({
    data: { configuration: { apiKey: 'saved-secret' } },
  });
});

it('copies a Provider from its complete configuration', async () => {
  const app = createTestApp();
  await app.request('/api/providers', {
    body: JSON.stringify({
      ...codexProviderRequest,
      configuration: { ...codexProviderRequest.configuration, apiKey: 'saved-secret' },
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const response = await app.request('/api/providers/provider-1/copy', {
    body: JSON.stringify({
      ...codexProviderRequest,
      configuration: {
        ...codexProviderRequest.configuration,
        apiKey: 'saved-secret',
      },
      name: 'Example Copy',
    } satisfies CreateProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toMatchObject({
    status: 'SUCCESS',
    data: { id: 'provider-2', name: 'Example Copy' },
  });
  const detailResponse = await app.request('/api/providers/provider-2');
  await expect(detailResponse.json()).resolves.toMatchObject({
    data: {
      configuration: { apiKey: 'saved-secret' },
      name: 'Example Copy',
    },
  });
});

it('returns business errors for missing Providers and rejects Runtime changes', async () => {
  const app = createTestApp();
  const missing = await app.request('/api/providers/missing');
  expect(missing.status).toBe(200);
  await expect(missing.json()).resolves.toMatchObject({
    status: 'PROVIDER_NOT_FOUND',
    data: null,
  });

  await app.request('/api/providers', {
    body: JSON.stringify(codexProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const runtimeChange = await app.request('/api/providers/provider-1', {
    body: JSON.stringify(claudeProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  });
  expect(runtimeChange.status).toBe(400);
  const copyRuntimeChange = await app.request('/api/providers/provider-1/copy', {
    body: JSON.stringify(claudeProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  expect(copyRuntimeChange.status).toBe(400);

  const missingUpdate = await app.request('/api/providers/missing', {
    body: JSON.stringify(codexProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  });
  expect(missingUpdate.status).toBe(200);
  await expect(missingUpdate.json()).resolves.toMatchObject({
    status: 'PROVIDER_NOT_FOUND',
    data: null,
  });

  const missingCopy = await app.request('/api/providers/missing/copy', {
    body: JSON.stringify(codexProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  expect(missingCopy.status).toBe(200);
  await expect(missingCopy.json()).resolves.toMatchObject({
    status: 'PROVIDER_NOT_FOUND',
    data: null,
  });
});

it('rejects invalid Provider updates', async () => {
  const app = createTestApp();
  await app.request('/api/providers', {
    body: JSON.stringify(codexProviderRequest),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const response = await app.request('/api/providers/provider-1', {
    body: JSON.stringify({ ...codexProviderRequest, name: '' }),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  });

  expect(response.status).toBe(400);
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
