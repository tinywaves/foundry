import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { test } from 'vitest';
import type { FoundryApi } from '../../../../shared/foundry-contract';
import type {
  ProviderApi,
  ProviderRuntime,
  ProviderSummary,
} from '../../../../shared/provider-contract';
import type {
  ChatGptApplicationState,
  ChatGptRestartResult,
  RuntimeApi,
  RuntimeApiError,
  RuntimeConfigurationPreview,
  RuntimeConfigurationPreviewInput,
  RuntimeSummary,
} from '../../../../shared/runtime-contract';
import { getCodexConfigurationManagedFieldKeys } from '../../../../shared/runtime-contract';
import {
  applyRuntimeConfiguration,
  getChatGptApplicationState,
  restartChatGptApplication,
  getRuntimeListQueryOptions,
  getRuntimePreviewQueryOptions,
  isRuntimeConfigurationPreview,
  isRuntimeSummaryList,
  resetRuntimeProviderState,
  resolveRuntimeRequest,
  RuntimeRequestError,
  runtimeQueryKeys,
} from './runtime-query';
import { providerQueryKeys } from '../providers/provider-query';

const unmanagedRuntimes: RuntimeSummary[] = [
  {
    runtime: 'codex',
    status: 'not-managed',
    providerId: null,
    appliedAt: null,
  },
  {
    runtime: 'claude-code',
    status: 'not-managed',
    providerId: null,
    appliedAt: null,
  },
];

function rejectedCall<T>(): Promise<T> {
  return Promise.reject(new Error('Unexpected API call'));
}

function installRuntimeApi(overrides: Partial<RuntimeApi>): void {
  const runtimes: RuntimeApi = {
    listRuntimes: () => rejectedCall(),
    previewRuntimeConfiguration: () => rejectedCall(),
    applyRuntimeConfiguration: () => rejectedCall(),
    getChatGptApplicationState: () => rejectedCall(),
    restartChatGptApplication: () => rejectedCall(),
    ...overrides,
  };
  const providers: ProviderApi = {
    listProviders: () => rejectedCall(),
    getProviderForEdit: () => rejectedCall(),
    getProviderAvatar: () => rejectedCall(),
    selectProviderAvatar: () => rejectedCall(),
    createProvider: () => rejectedCall(),
    updateProvider: () => rejectedCall(),
    deleteProvider: () => rejectedCall(),
    revealProviderApiKey: () => rejectedCall(),
    copyProviderApiKey: () => rejectedCall(),
    testSavedProviderConnection: () => rejectedCall(),
    testDraftProviderConnection: () => rejectedCall(),
  };
  Object.defineProperty(globalThis, 'api', {
    configurable: true,
    value: {
      applicationVersion: '0.0.0-test',
      platform: 'darwin',
      prompts: {} as FoundryApi['prompts'],
      providers,
      runtimes,
      settings: {} as FoundryApi['settings'],
    } satisfies FoundryApi,
  });
}

function createProvider(id: string, runtime: ProviderRuntime): ProviderSummary {
  return {
    id,
    runtime,
    source: 'user-custom',
    name: `Provider ${id}`,
    baseUrl: `https://${id}.example.com`,
    remark: null,
    officialWebsite: null,
    hasApiKey: true,
    apiKeySuffix: '1234',
    hasCustomAvatar: false,
    isInUse: false,
    connection: {
      status: 'never-tested',
      lastTestedAt: null,
      lastError: null,
    },
    createdAt: 1,
    updatedAt: 1,
  };
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

const codexPreviewInput: RuntimeConfigurationPreviewInput = {
  runtime: 'codex',
  target: {
    kind: 'provider',
    providerId: '00000000-0000-4000-8000-000000000001',
  },
};

function createCodexPreview(
  configurationProviderKey = 'foundry_managed',
): RuntimeConfigurationPreview {
  return {
    runtime: 'codex',
    target: {
      kind: 'provider',
      providerId: codexPreviewInput.target.kind === 'provider'
        ? codexPreviewInput.target.providerId
        : '',
      name: 'Codex Provider',
      baseUrl: 'https://codex.example.com',
      hasApiKey: true,
      apiKeySuffix: '1234',
      connection: {
        status: 'never-tested',
        lastTestedAt: null,
        lastError: null,
      },
    },
    file: { path: '~/.codex/config.toml', exists: true },
    fields: getCodexConfigurationManagedFieldKeys(configurationProviderKey).map((key) => ({
      key,
      current: key.endsWith('experimental_bearer_token')
        ? { kind: 'secret' as const, configured: false, suffix: null }
        : { kind: 'absent' as const },
      proposed: key.endsWith('experimental_bearer_token')
        ? { kind: 'secret' as const, configured: true, suffix: '1234' }
        : { kind: 'plain' as const, value: 'next' },
      operation: 'add' as const,
    })),
  };
}

test('adapts Runtime API errors and unexpected rejections', async () => {
  const apiError: RuntimeApiError = {
    code: 'storage-unavailable',
    message: 'Runtime storage is unavailable.',
  };

  await assert.rejects(
    resolveRuntimeRequest(
      () => Promise.resolve({ ok: false, error: apiError }),
      'Fallback message',
    ),
    (error: unknown) => (
      error instanceof RuntimeRequestError
      && error.message === apiError.message
      && error.apiError === apiError
    ),
  );
  await assert.rejects(
    resolveRuntimeRequest(
      () => Promise.reject(new Error('IPC unavailable')),
      'Fallback message',
    ),
    (error: unknown) => (
      error instanceof RuntimeRequestError
      && error.message === 'Fallback message'
      && error.apiError === undefined
    ),
  );
});

test('uses one fixed Runtime list query key', () => {
  assert.deepEqual(runtimeQueryKeys.all, ['runtimes']);
  assert.deepEqual(runtimeQueryKeys.list(), ['runtimes', 'list']);
});

test('validates fixed Runtime identities, order, and discriminated fields', async () => {
  const managedRuntimes: RuntimeSummary[] = [
    {
      runtime: 'codex',
      status: 'provider',
      providerId: '00000000-0000-4000-8000-000000000001',
      appliedAt: 10,
    },
    {
      runtime: 'claude-code',
      status: 'official-default',
      providerId: null,
      appliedAt: 20,
    },
  ];
  assert.equal(isRuntimeSummaryList(managedRuntimes), true);
  assert.equal(isRuntimeSummaryList(managedRuntimes.toReversed()), false);
  assert.equal(isRuntimeSummaryList([
    { ...managedRuntimes[0], providerId: null },
    managedRuntimes[1],
  ]), false);

  installRuntimeApi({
    listRuntimes: () => Promise.resolve({
      ok: true,
      value: managedRuntimes.toReversed(),
    }),
  });
  await assert.rejects(
    createQueryClient().fetchQuery(getRuntimeListQueryOptions()),
    (error: unknown) => (
      error instanceof RuntimeRequestError
      && error.message === 'Runtime data was invalid.'
    ),
  );
});

test('loads valid Runtime summaries through the renderer query boundary', async () => {
  installRuntimeApi({
    listRuntimes: () => Promise.resolve({ ok: true, value: unmanagedRuntimes }),
  });
  const result = await createQueryClient().fetchQuery(getRuntimeListQueryOptions());
  assert.deepEqual(result, unmanagedRuntimes);
});

test('applies and validates the Runtime response against the requested target', async () => {
  const input = codexPreviewInput;
  const summary: RuntimeSummary = {
    runtime: 'codex',
    status: 'provider',
    providerId: input.target.kind === 'provider' ? input.target.providerId : '',
    appliedAt: 10,
  };
  installRuntimeApi({
    applyRuntimeConfiguration: () => Promise.resolve({ ok: true, value: summary }),
  });
  assert.deepEqual(await applyRuntimeConfiguration(input), summary);

  installRuntimeApi({
    applyRuntimeConfiguration: () => Promise.resolve({
      ok: true,
      value: { ...summary, providerId: 'wrong-provider' },
    }),
  });
  await assert.rejects(
    applyRuntimeConfiguration(input),
    (error: unknown) => (
      error instanceof RuntimeRequestError
      && error.message === 'Runtime application response did not match the target.'
    ),
  );
});

test('validates ChatGPT application states through the renderer boundary', async () => {
  for (const state of ['running', 'not-running', 'unavailable'] as const) {
    installRuntimeApi({
      getChatGptApplicationState: () => Promise.resolve({ ok: true, value: state }),
    });
    assert.equal(await getChatGptApplicationState(), state);
  }

  installRuntimeApi({
    getChatGptApplicationState: () => Promise.resolve({
      ok: true,
      value: 'unexpected' as ChatGptApplicationState,
    }),
  });
  await assert.rejects(
    getChatGptApplicationState(),
    (error: unknown) => (
      error instanceof RuntimeRequestError
      && error.message === 'ChatGPT application state was invalid.'
      && error.apiError === undefined
    ),
  );
});

test('validates ChatGPT restart results through the renderer boundary', async () => {
  for (const result of [
    'restarted',
    'not-running',
    'quit-failed',
    'reopen-failed',
    'unavailable',
  ] as const) {
    installRuntimeApi({
      restartChatGptApplication: () => Promise.resolve({ ok: true, value: result }),
    });
    assert.equal(await restartChatGptApplication(), result);
  }

  installRuntimeApi({
    restartChatGptApplication: () => Promise.resolve({
      ok: true,
      value: 'unexpected' as ChatGptRestartResult,
    }),
  });
  await assert.rejects(
    restartChatGptApplication(),
    (error: unknown) => (
      error instanceof RuntimeRequestError
      && error.message === 'ChatGPT restart response was invalid.'
      && error.apiError === undefined
    ),
  );
});

test('loads and validates a sanitized Runtime configuration preview', async () => {
  const preview = createCodexPreview();
  assert.equal(isRuntimeConfigurationPreview(preview, codexPreviewInput), true);
  installRuntimeApi({
    previewRuntimeConfiguration: () => Promise.resolve({ ok: true, value: preview }),
  });

  const result = await createQueryClient().fetchQuery(
    getRuntimePreviewQueryOptions(codexPreviewInput),
  );
  assert.deepEqual(result, preview);
});

test('validates a Codex preview with the current custom Provider key', () => {
  assert.equal(
    isRuntimeConfigurationPreview(createCodexPreview('zode'), codexPreviewInput),
    true,
  );

  const mismatchedPaths = createCodexPreview('zode');
  mismatchedPaths.fields[4].key = 'model_providers.other.base_url';
  assert.equal(isRuntimeConfigurationPreview(mismatchedPaths, codexPreviewInput), false);
});

test('validates only Codex selection fields for an Official Default preview', () => {
  const input: RuntimeConfigurationPreviewInput = {
    runtime: 'codex',
    target: { kind: 'official-default' },
  };
  const preview: RuntimeConfigurationPreview = {
    runtime: 'codex',
    target: { kind: 'official-default' },
    file: { path: '~/.codex/config.toml', exists: true },
    fields: ['model', 'model_provider', 'forced_login_method'].map((key) => ({
      key,
      current: { kind: 'plain', value: 'configured' },
      proposed: { kind: 'absent' },
      operation: 'remove',
    })),
  };

  assert.equal(isRuntimeConfigurationPreview(preview, input), true);
  preview.fields.push({
    key: 'model_providers.custom.name',
    current: { kind: 'plain', value: 'Custom' },
    proposed: { kind: 'absent' },
    operation: 'remove',
  });
  assert.equal(isRuntimeConfigurationPreview(preview, input), false);
});

test('rejects reordered fields and plaintext values in a secret preview row', async () => {
  const reordered = createCodexPreview();
  reordered.fields = reordered.fields.toReversed();
  assert.equal(isRuntimeConfigurationPreview(reordered, codexPreviewInput), false);

  const plaintextSecret = createCodexPreview();
  const secretField = plaintextSecret.fields.at(-1);
  assert.ok(secretField);
  secretField.proposed = { kind: 'plain', value: 'plaintext-secret' };
  assert.equal(isRuntimeConfigurationPreview(plaintextSecret, codexPreviewInput), false);

  installRuntimeApi({
    previewRuntimeConfiguration: () => Promise.resolve({
      ok: true,
      value: plaintextSecret,
    }),
  });
  await assert.rejects(
    createQueryClient().fetchQuery(getRuntimePreviewQueryOptions(codexPreviewInput)),
    (error: unknown) => (
      error instanceof RuntimeRequestError
      && error.message === 'Runtime configuration preview was invalid.'
    ),
  );
});

test('resets the Runtime list and only the affected Provider inventory', async () => {
  const queryClient = createQueryClient();
  const codex = createProvider('codex-provider', 'codex');
  const claude = createProvider('claude-provider', 'claude-code');
  queryClient.setQueryData(runtimeQueryKeys.list(), unmanagedRuntimes);
  queryClient.setQueryData(providerQueryKeys.list('codex'), [codex]);
  queryClient.setQueryData(providerQueryKeys.list('claude-code'), [claude]);
  queryClient.setQueryData(
    providerQueryKeys.avatar('codex', codex.id),
    { mimeType: 'image/png', bytes: Uint8Array.from([1]) },
  );

  await resetRuntimeProviderState(queryClient, 'codex');
  assert.equal(queryClient.getQueryData(runtimeQueryKeys.list()), undefined);
  assert.equal(queryClient.getQueryData(providerQueryKeys.list('codex')), undefined);
  assert.equal(
    queryClient.getQueryData(providerQueryKeys.avatar('codex', codex.id)),
    undefined,
  );
  assert.deepEqual(queryClient.getQueryData(providerQueryKeys.list('claude-code')), [claude]);
});
