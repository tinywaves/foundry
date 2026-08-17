import assert from 'node:assert/strict';
import { MutationObserver, QueryClient } from '@tanstack/react-query';
import { test } from 'vitest';
import type { FoundryApi } from '../../../../shared/foundry-contract';
import type {
  ProviderApi,
  ProviderApiError,
  ProviderDetail,
  ProviderRuntime,
  ProviderSummary,
} from '../../../../shared/provider-contract';
import {
  getProviderAvatarQueryOptions,
  getProviderDetailQueryOptions,
  getProviderListQueryOptions,
  getSavedProviderTestMutationKey,
  isMatchingCustomProvider,
  ProviderRequestError,
  providerQueryKeys,
  removeProviderDetail,
  replaceCachedProvider,
  resetProviderList,
  resolveProviderRequest,
} from './provider-query';

const connection = {
  status: 'never-tested' as const,
  lastTestedAt: null,
  lastError: null,
};

function createProvider(
  id: string,
  runtime: ProviderRuntime = 'codex',
  source: ProviderSummary['source'] = 'user-custom',
): ProviderSummary {
  return {
    id,
    runtime,
    source,
    name: `Provider ${id}`,
    baseUrl: `https://${id}.example.com`,
    remark: null,
    officialWebsite: null,
    hasApiKey: true,
    apiKeySuffix: '1234',
    hasCustomAvatar: false,
    isInUse: false,
    connection,
    createdAt: 1,
    updatedAt: 1,
  };
}

function createDetail(provider: ProviderSummary, apiKey = 'complete-secret'): ProviderDetail {
  assert.equal(provider.runtime, 'codex');
  return {
    ...provider,
    runtime: 'codex',
    apiKey,
    modelConfig: { version: 1, defaultModel: 'gpt-default' },
  };
}

function rejectedProviderCall<T>(): Promise<T> {
  return Promise.reject(new Error('Unexpected Provider API call'));
}

function installProviderApi(overrides: Partial<ProviderApi>): void {
  const providers: ProviderApi = {
    listProviders: () => rejectedProviderCall(),
    getProviderForEdit: () => rejectedProviderCall(),
    getProviderAvatar: () => rejectedProviderCall(),
    selectProviderAvatar: () => rejectedProviderCall(),
    createProvider: () => rejectedProviderCall(),
    updateProvider: () => rejectedProviderCall(),
    deleteProvider: () => rejectedProviderCall(),
    revealProviderApiKey: () => rejectedProviderCall(),
    copyProviderApiKey: () => rejectedProviderCall(),
    testSavedProviderConnection: () => rejectedProviderCall(),
    testDraftProviderConnection: () => rejectedProviderCall(),
    ...overrides,
  };
  Object.defineProperty(globalThis, 'api', {
    configurable: true,
    value: {
      platform: 'darwin',
      prompts: {} as FoundryApi['prompts'],
      providers,
      runtimes: {
        listRuntimes: () => rejectedProviderCall(),
        previewRuntimeConfiguration: () => rejectedProviderCall(),
        applyRuntimeConfiguration: () => rejectedProviderCall(),
        getChatGptApplicationState: () => rejectedProviderCall(),
        restartChatGptApplication: () => rejectedProviderCall(),
      },
      settings: {} as FoundryApi['settings'],
    } satisfies FoundryApi,
  });
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

test('adapts Provider API errors and unexpected rejections', async () => {
  const apiError: ProviderApiError = {
    code: 'invalid-input',
    message: 'Invalid Provider',
    fields: [{ field: 'baseUrl', message: 'Invalid URL' }],
  };

  await assert.rejects(
    resolveProviderRequest(
      () => Promise.resolve({ ok: false, error: apiError }),
      'Fallback message',
    ),
    (error: unknown) => (
      error instanceof ProviderRequestError
      && error.message === apiError.message
      && error.apiError === apiError
    ),
  );
  await assert.rejects(
    resolveProviderRequest(
      () => Promise.reject(new Error('IPC unavailable')),
      'Fallback message',
    ),
    (error: unknown) => (
      error instanceof ProviderRequestError
      && error.message === 'Fallback message'
      && error.apiError === undefined
    ),
  );
});

test('isolates Provider query keys by resource, runtime, and id', () => {
  assert.deepEqual(providerQueryKeys.list('codex'), ['providers', 'list', 'codex']);
  assert.deepEqual(
    providerQueryKeys.list('claude-code'),
    ['providers', 'list', 'claude-code'],
  );
  assert.deepEqual(
    providerQueryKeys.avatar('codex', 'provider-1'),
    ['providers', 'avatar', 'codex', 'provider-1'],
  );
  assert.deepEqual(
    providerQueryKeys.detail('codex', 'provider-1'),
    ['providers', 'detail', 'codex', 'provider-1'],
  );
});

test('isolates saved Provider test mutations by runtime and id', async () => {
  const queryClient = createQueryClient();
  const codexProvider = createProvider('shared-id');
  const claudeProvider = createProvider('shared-id', 'claude-code');
  const codexRequest = Promise.withResolvers<ProviderSummary>();
  const claudeRequest = Promise.withResolvers<ProviderSummary>();
  const codexKey = getSavedProviderTestMutationKey(codexProvider);
  const claudeKey = getSavedProviderTestMutationKey(claudeProvider);
  assert.notDeepEqual(codexKey, getSavedProviderTestMutationKey(createProvider('other-id')));
  assert.notDeepEqual(codexKey, claudeKey);
  const codexObserver = new MutationObserver<ProviderSummary, Error, undefined>(queryClient, {
    mutationFn: () => codexRequest.promise,
    mutationKey: codexKey,
  });
  const claudeObserver = new MutationObserver<ProviderSummary, Error, undefined>(queryClient, {
    mutationFn: () => claudeRequest.promise,
    mutationKey: claudeKey,
  });
  const unsubscribeCodex = codexObserver.subscribe(() => {});
  const unsubscribeClaude = claudeObserver.subscribe(() => {});

  const pendingCodex = codexObserver.mutate(undefined);
  const pendingClaude = claudeObserver.mutate(undefined);
  assert.equal(queryClient.isMutating({ exact: true, mutationKey: codexKey }), 1);
  assert.equal(queryClient.isMutating({ exact: true, mutationKey: claudeKey }), 1);

  codexRequest.resolve(codexProvider);
  await pendingCodex;
  assert.equal(queryClient.isMutating({ exact: true, mutationKey: codexKey }), 0);
  assert.equal(queryClient.isMutating({ exact: true, mutationKey: claudeKey }), 1);

  claudeRequest.resolve(claudeProvider);
  await pendingClaude;
  assert.equal(queryClient.isMutating({ exact: true, mutationKey: claudeKey }), 0);
  unsubscribeCodex();
  unsubscribeClaude();
});

test('matches only the expected custom Provider response', () => {
  const provider = createProvider('provider-1');
  assert.equal(isMatchingCustomProvider(provider, 'codex'), true);
  assert.equal(isMatchingCustomProvider(provider, 'codex', provider.id), true);
  assert.equal(isMatchingCustomProvider(provider, 'codex', 'different'), false);
  assert.equal(isMatchingCustomProvider(provider, 'claude-code'), false);
  assert.equal(
    isMatchingCustomProvider(createProvider('built-in', 'codex', 'foundry-built-in'), 'codex'),
    false,
  );
});

test('filters list data and rejects mismatched Edit details', async () => {
  const matching = createProvider('matching');
  const builtIn = createProvider('built-in', 'codex', 'foundry-built-in');
  const otherRuntime = createProvider('other-runtime', 'claude-code');
  installProviderApi({
    listProviders: () => Promise.resolve({
      ok: true,
      value: [matching, builtIn, otherRuntime],
    }),
    getProviderForEdit: () => Promise.resolve({
      ok: true,
      value: createDetail(createProvider('different')),
    }),
  });

  const queryClient = createQueryClient();
  const providers = await queryClient.fetchQuery(getProviderListQueryOptions('codex'));
  assert.deepEqual(providers, [matching]);
  await assert.rejects(
    queryClient.fetchQuery(getProviderDetailQueryOptions(matching)),
    (error: unknown) => (
      error instanceof ProviderRequestError
      && error.message === 'The selected provider did not match this row.'
    ),
  );
});

test('replaces only an existing matching runtime row and resets one runtime cache', async () => {
  const queryClient = createQueryClient();
  const codex = createProvider('codex-row');
  const claude = createProvider('claude-row', 'claude-code');
  const updatedCodex = { ...codex, name: 'Updated Provider' };
  queryClient.setQueryData(providerQueryKeys.list('codex'), [codex]);
  queryClient.setQueryData(providerQueryKeys.list('claude-code'), [claude]);
  queryClient.setQueryData(
    providerQueryKeys.avatar('codex', codex.id),
    { mimeType: 'image/png', bytes: Uint8Array.from([1]) },
  );

  replaceCachedProvider(queryClient, 'codex', updatedCodex);
  replaceCachedProvider(queryClient, 'codex', createProvider('missing'));
  replaceCachedProvider(queryClient, 'codex', claude);
  assert.deepEqual(queryClient.getQueryData(providerQueryKeys.list('codex')), [updatedCodex]);
  assert.deepEqual(queryClient.getQueryData(providerQueryKeys.list('claude-code')), [claude]);

  await resetProviderList(queryClient, 'codex');
  assert.equal(queryClient.getQueryData(providerQueryKeys.list('codex')), undefined);
  assert.equal(
    queryClient.getQueryData(providerQueryKeys.avatar('codex', codex.id)),
    undefined,
  );
  assert.deepEqual(queryClient.getQueryData(providerQueryKeys.list('claude-code')), [claude]);
});

test('removes sensitive detail data and ignores a late request result', async () => {
  const provider = createProvider('sensitive');
  const detail = createDetail(provider);
  let resolveRequest: ((value: ProviderDetail) => void) | undefined;
  installProviderApi({
    getProviderForEdit: () => new Promise((resolve) => {
      resolveRequest = (value) => resolve({ ok: true, value });
    }),
  });

  const queryClient = createQueryClient();
  const queryKey = providerQueryKeys.detail(provider.runtime, provider.id);
  queryClient.setQueryData(queryKey, detail);
  removeProviderDetail(queryClient, provider.runtime, provider.id);
  assert.equal(queryClient.getQueryData(queryKey), undefined);

  const pendingRequest = queryClient.fetchQuery(getProviderDetailQueryOptions(provider));
  assert.ok(resolveRequest);
  removeProviderDetail(queryClient, provider.runtime, provider.id);
  resolveRequest(detail);
  await assert.rejects(pendingRequest);
  await Promise.resolve();
  assert.equal(queryClient.getQueryData(queryKey), undefined);
});

test('uses the approved list, avatar, and sensitive-detail cache lifetimes', () => {
  const provider = createProvider('cache-policy');
  const listOptions = getProviderListQueryOptions('codex');
  const avatarOptions = getProviderAvatarQueryOptions('codex', provider.id);
  const detailOptions = getProviderDetailQueryOptions(provider);

  assert.equal(listOptions.staleTime, Infinity);
  assert.equal(listOptions.gcTime, Infinity);
  assert.equal(avatarOptions.staleTime, Infinity);
  assert.equal(avatarOptions.gcTime, 5 * 60 * 1000);
  assert.equal(detailOptions.staleTime, Infinity);
  assert.equal(detailOptions.gcTime, 0);
});

test('mutation reset preserves cache callbacks and suppresses late observer callbacks', async () => {
  const queryClient = createQueryClient();
  const mutation = Promise.withResolvers<string>();
  let cacheSuccesses = 0;
  let observerSuccesses = 0;
  const observer = new MutationObserver<string, Error, string>(queryClient, {
    mutationFn: () => mutation.promise,
    onSuccess: () => {
      cacheSuccesses += 1;
    },
  });
  const unsubscribe = observer.subscribe(() => {});
  const pendingMutation = observer.mutate('draft', {
    onSuccess: () => {
      observerSuccesses += 1;
    },
  });
  observer.reset();
  mutation.resolve('saved');
  await pendingMutation;

  assert.equal(cacheSuccesses, 1);
  assert.equal(observerSuccesses, 0);
  assert.equal(observer.getCurrentResult().status, 'idle');
  unsubscribe();
});
