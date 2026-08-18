import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { test } from 'vitest';
import type { FoundryApi } from '../../../../shared/foundry-contract';
import type {
  PromptApi,
  PromptApiError,
  PromptDetail,
  PromptSummary,
  PromptVersionSummary,
  TrashedPromptDetail,
  TrashedPromptSummary,
} from '../../../../shared/prompt-contract';
import {
  emptyPromptTrashCaches,
  getPromptDetailQueryOptions,
  getPromptListQueryOptions,
  getPromptVersionListQueryOptions,
  getPromptVersionQueryOptions,
  getTrashedPromptDetailQueryOptions,
  getTrashedPromptListQueryOptions,
  movePromptToTrashCaches,
  PromptRequestError,
  promptQueryKeys,
  removePromptFromTrashCaches,
  resolvePromptRequest,
  restoreTrashedPromptCaches,
  shouldRetryPromptRead,
  updatePromptCaches,
} from './prompt-query';

function createPrompt(id: string, updatedAt: number): PromptDetail {
  return {
    id,
    title: `Prompt ${id}`,
    description: null,
    content: `Content ${id}`,
    currentVersion: 1,
    createdAt: 1,
    updatedAt,
  };
}

function toSummary(prompt: PromptDetail): PromptSummary {
  const { content: _content, ...summary } = prompt;
  return summary;
}

function toTrashedPrompt(prompt: PromptDetail, trashedAt: number): TrashedPromptDetail {
  return { ...prompt, trashedAt };
}

function toTrashedSummary(prompt: TrashedPromptDetail): TrashedPromptSummary {
  const {
    content: _content,
    createdAt: _createdAt,
    currentVersion: _currentVersion,
    description: _description,
    updatedAt: _updatedAt,
    ...summary
  } = prompt;
  return summary;
}

function rejectedPromptCall<T>(): Promise<T> {
  return Promise.reject(new Error('Unexpected Prompt API call'));
}

function installPromptApi(overrides: Partial<PromptApi>): void {
  const prompts: PromptApi = {
    listPrompts: () => rejectedPromptCall(),
    getPrompt: () => rejectedPromptCall(),
    createPrompt: () => rejectedPromptCall(),
    updatePrompt: () => rejectedPromptCall(),
    movePromptToTrash: () => rejectedPromptCall(),
    listPromptVersions: () => rejectedPromptCall(),
    getPromptVersion: () => rejectedPromptCall(),
    restorePromptVersion: () => rejectedPromptCall(),
    copyPrompt: () => rejectedPromptCall(),
    copyPromptVersion: () => rejectedPromptCall(),
    listTrashedPrompts: () => rejectedPromptCall(),
    getTrashedPrompt: () => rejectedPromptCall(),
    restoreTrashedPrompt: () => rejectedPromptCall(),
    removePromptFromTrash: () => rejectedPromptCall(),
    emptyPromptTrash: () => rejectedPromptCall(),
    ...overrides,
  };
  Object.defineProperty(globalThis, 'api', {
    configurable: true,
    value: {
      applicationVersion: '0.0.0-test',
      platform: 'darwin',
      prompts,
      providers: {} as FoundryApi['providers'],
      runtimes: {} as FoundryApi['runtimes'],
      settings: {} as FoundryApi['settings'],
    } satisfies FoundryApi,
  });
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

test('adapts Prompt API failures without exposing unexpected errors', async () => {
  const apiError: PromptApiError = {
    code: 'invalid-input',
    message: 'Prompt input is invalid.',
    fields: [{ field: 'title', message: 'This field is required.' }],
  };
  await assert.rejects(
    resolvePromptRequest(
      () => Promise.resolve({ ok: false, error: apiError }),
      'Fallback',
    ),
    (error: unknown) => (
      error instanceof PromptRequestError
      && error.message === apiError.message
      && error.apiError === apiError
    ),
  );
  await assert.rejects(
    resolvePromptRequest(
      () => Promise.reject(new Error('IPC unavailable')),
      'Fallback',
    ),
    (error: unknown) => (
      error instanceof PromptRequestError
      && error.message === 'Fallback'
      && error.apiError === undefined
    ),
  );
});

test('retries only one transient Prompt read failure', () => {
  const error = (code: PromptApiError['code']) => new PromptRequestError('Failed', {
    code,
    message: 'Failed',
  });
  assert.equal(shouldRetryPromptRead(0, error('storage-unavailable')), true);
  assert.equal(shouldRetryPromptRead(0, error('internal')), true);
  assert.equal(shouldRetryPromptRead(1, error('internal')), false);
  assert.equal(shouldRetryPromptRead(0, error('invalid-input')), false);
  assert.equal(shouldRetryPromptRead(0, error('not-found')), false);
  assert.equal(shouldRetryPromptRead(0, error('storage-corrupt')), false);
  assert.equal(shouldRetryPromptRead(0, error('unsupported-database-version')), false);
  assert.equal(shouldRetryPromptRead(0, new Error('Unknown')), false);
  assert.equal(
    shouldRetryPromptRead(0, new PromptRequestError('Unexpected rejection')),
    true,
  );
});

test('wires the bounded read retry policy into Prompt queries', async () => {
  let transientCalls = 0;
  installPromptApi({
    listPrompts: () => {
      transientCalls += 1;
      return Promise.resolve({
        ok: false,
        error: { code: 'storage-unavailable', message: 'Storage unavailable.' },
      });
    },
  });
  await assert.rejects(createQueryClient().fetchQuery({
    ...getPromptListQueryOptions(),
    retryDelay: 0,
  }));
  assert.equal(transientCalls, 2);

  let versionCalls = 0;
  installPromptApi({
    listPromptVersions: () => {
      versionCalls += 1;
      return Promise.resolve({
        ok: false,
        error: { code: 'internal', message: 'Version history unavailable.' },
      });
    },
  });
  await assert.rejects(createQueryClient().fetchQuery({
    ...getPromptVersionListQueryOptions('prompt-1'),
    retryDelay: 0,
  }));
  assert.equal(versionCalls, 2);

  let notFoundCalls = 0;
  installPromptApi({
    getPrompt: () => {
      notFoundCalls += 1;
      return Promise.resolve({
        ok: false,
        error: { code: 'not-found', message: 'Prompt not found.' },
      });
    },
  });
  await assert.rejects(createQueryClient().fetchQuery({
    ...getPromptDetailQueryOptions('missing'),
    retryDelay: 0,
  }));
  assert.equal(notFoundCalls, 1);
});

test('loads Prompt lists and details through isolated query keys', async () => {
  const detail = createPrompt('prompt-1', 2);
  installPromptApi({
    listPrompts: () => Promise.resolve({ ok: true, value: [toSummary(detail)] }),
    getPrompt: () => Promise.resolve({ ok: true, value: detail }),
  });
  const queryClient = createQueryClient();
  assert.deepEqual(promptQueryKeys.list(), ['prompts', 'list']);
  assert.deepEqual(promptQueryKeys.detail(detail.id), ['prompts', 'detail', detail.id]);
  assert.deepEqual(
    promptQueryKeys.versionList(detail.id),
    ['prompts', 'version-list', detail.id],
  );
  assert.deepEqual(
    promptQueryKeys.version(detail.id, 1),
    ['prompts', 'version', detail.id, 1],
  );
  assert.deepEqual(promptQueryKeys.trashList(), ['prompts', 'trash-list']);
  assert.deepEqual(
    promptQueryKeys.trashDetail(detail.id),
    ['prompts', 'trash-detail', detail.id],
  );
  assert.deepEqual(
    await queryClient.fetchQuery(getPromptListQueryOptions()),
    [toSummary(detail)],
  );
  assert.deepEqual(
    await queryClient.fetchQuery(getPromptDetailQueryOptions(detail.id)),
    detail,
  );
});

test('loads Trash lists and details with the bounded read retry policy', async () => {
  const trashed = toTrashedPrompt(createPrompt('prompt-1', 2), 3);
  let listCalls = 0;
  installPromptApi({
    listTrashedPrompts: () => {
      listCalls += 1;
      if (listCalls === 1) {
        return Promise.resolve({
          ok: false,
          error: { code: 'storage-unavailable', message: 'Storage unavailable.' },
        });
      }
      return Promise.resolve({ ok: true, value: [toTrashedSummary(trashed)] });
    },
    getTrashedPrompt: () => Promise.resolve({ ok: true, value: trashed }),
  });
  const queryClient = createQueryClient();
  assert.deepEqual(
    await queryClient.fetchQuery({
      ...getTrashedPromptListQueryOptions(),
      retryDelay: 0,
    }),
    [toTrashedSummary(trashed)],
  );
  assert.equal(listCalls, 2);
  assert.deepEqual(
    await queryClient.fetchQuery(getTrashedPromptDetailQueryOptions(trashed.id)),
    trashed,
  );
});

test('loads Prompt version lists and immutable details through isolated queries', async () => {
  const detail = createPrompt('prompt-1', 2);
  const versions: PromptVersionSummary[] = [
    {
      promptId: detail.id,
      version: 1,
      createdAt: detail.updatedAt,
    },
  ];
  installPromptApi({
    listPromptVersions: () => Promise.resolve({ ok: true, value: versions }),
    getPromptVersion: () => Promise.resolve({
      ok: true,
      value: {
        ...versions[0],
        title: detail.title,
        description: detail.description,
        content: detail.content,
      },
    }),
  });
  const queryClient = createQueryClient();
  assert.deepEqual(
    await queryClient.fetchQuery(getPromptVersionListQueryOptions(detail.id)),
    versions,
  );
  assert.deepEqual(
    await queryClient.fetchQuery(getPromptVersionQueryOptions({
      id: detail.id,
      version: 1,
    })),
    {
      ...versions[0],
      title: detail.title,
      description: detail.description,
      content: detail.content,
    },
  );
});

test('updates detail and ordered summary caches without leaking content', () => {
  const queryClient = createQueryClient();
  const older = createPrompt('older', 1);
  const newer = createPrompt('newer', 3);
  queryClient.setQueryData(promptQueryKeys.list(), [toSummary(older)]);

  updatePromptCaches(queryClient, newer);
  assert.deepEqual(
    queryClient.getQueryData(promptQueryKeys.detail(newer.id)),
    newer,
  );
  assert.deepEqual(
    queryClient.getQueryData(promptQueryKeys.list()),
    [toSummary(newer), toSummary(older)],
  );

  const updatedOlder = { ...older, content: 'Updated', updatedAt: 4 };
  updatePromptCaches(queryClient, updatedOlder);
  const summaries = queryClient.getQueryData<PromptSummary[]>(promptQueryKeys.list());
  assert.deepEqual(summaries, [toSummary(updatedOlder), toSummary(newer)]);
  assert.ok(summaries);
  assert.equal('content' in summaries[0], false);
});

test('keeps an unloaded list absent while priming a Prompt detail', () => {
  const queryClient = createQueryClient();
  const detail = createPrompt('prompt-1', 1);
  updatePromptCaches(queryClient, detail);
  assert.equal(queryClient.getQueryData(promptQueryKeys.list()), undefined);
  assert.deepEqual(queryClient.getQueryData(promptQueryKeys.detail(detail.id)), detail);
  assert.equal(
    queryClient.getQueryData(promptQueryKeys.versionList(detail.id)),
    undefined,
  );
  assert.deepEqual(
    queryClient.getQueryData(promptQueryKeys.version(detail.id, 1)),
    {
      promptId: detail.id,
      version: 1,
      title: detail.title,
      description: detail.description,
      content: detail.content,
      createdAt: detail.updatedAt,
    },
  );
});

test('prepends material versions without duplicating no-op cache updates', () => {
  const queryClient = createQueryClient();
  const initial = createPrompt('prompt-1', 1);
  queryClient.setQueryData<PromptVersionSummary[]>(
    promptQueryKeys.versionList(initial.id),
    [{ promptId: initial.id, version: 1, createdAt: 1 }],
  );
  const updated: PromptDetail = {
    ...initial,
    title: 'Updated title',
    content: 'Updated content',
    currentVersion: 2,
    updatedAt: 2,
  };

  updatePromptCaches(queryClient, updated);
  updatePromptCaches(queryClient, updated);

  assert.deepEqual(
    queryClient.getQueryData(promptQueryKeys.versionList(updated.id)),
    [
      { promptId: updated.id, version: 2, createdAt: 2 },
      { promptId: updated.id, version: 1, createdAt: 1 },
    ],
  );
  assert.deepEqual(
    queryClient.getQueryData(promptQueryKeys.version(updated.id, 2)),
    {
      promptId: updated.id,
      version: 2,
      title: updated.title,
      description: updated.description,
      content: updated.content,
      createdAt: updated.updatedAt,
    },
  );
});

test('reconciles Move to Trash caches without inventing a deletion timestamp', () => {
  const queryClient = createQueryClient();
  const prompt = createPrompt('prompt-1', 2);
  queryClient.setQueryData(promptQueryKeys.list(), [toSummary(prompt)]);
  queryClient.setQueryData(promptQueryKeys.detail(prompt.id), prompt);
  queryClient.setQueryData(promptQueryKeys.versionList(prompt.id), []);
  queryClient.setQueryData(promptQueryKeys.version(prompt.id, 1), {});
  queryClient.setQueryData(promptQueryKeys.trashList(), []);
  queryClient.setQueryData(promptQueryKeys.trashDetail(prompt.id), {});

  movePromptToTrashCaches(queryClient, prompt.id);

  assert.deepEqual(queryClient.getQueryData(promptQueryKeys.list()), []);
  assert.equal(queryClient.getQueryData(promptQueryKeys.detail(prompt.id)), undefined);
  assert.equal(queryClient.getQueryData(promptQueryKeys.versionList(prompt.id)), undefined);
  assert.equal(queryClient.getQueryData(promptQueryKeys.version(prompt.id, 1)), undefined);
  assert.equal(queryClient.getQueryData(promptQueryKeys.trashList()), undefined);
  assert.equal(queryClient.getQueryData(promptQueryKeys.trashDetail(prompt.id)), undefined);
});

test('restores a trashed Prompt into active caches without creating a version', () => {
  const queryClient = createQueryClient();
  const prompt = createPrompt('prompt-1', 2);
  const trashed = toTrashedPrompt(prompt, 3);
  queryClient.setQueryData(promptQueryKeys.list(), []);
  queryClient.setQueryData(promptQueryKeys.trashList(), [toTrashedSummary(trashed)]);
  queryClient.setQueryData(promptQueryKeys.trashDetail(prompt.id), trashed);

  restoreTrashedPromptCaches(queryClient, prompt);

  assert.deepEqual(queryClient.getQueryData(promptQueryKeys.list()), [toSummary(prompt)]);
  assert.deepEqual(queryClient.getQueryData(promptQueryKeys.detail(prompt.id)), prompt);
  assert.deepEqual(
    queryClient.getQueryData(promptQueryKeys.version(prompt.id, prompt.currentVersion)),
    {
      promptId: prompt.id,
      version: prompt.currentVersion,
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      createdAt: prompt.updatedAt,
    },
  );
  assert.equal(queryClient.getQueryData(promptQueryKeys.versionList(prompt.id)), undefined);
  assert.deepEqual(queryClient.getQueryData(promptQueryKeys.trashList()), []);
  assert.equal(queryClient.getQueryData(promptQueryKeys.trashDetail(prompt.id)), undefined);
});

test('clears inaccessible Prompt caches after individual and aggregate removal', () => {
  const queryClient = createQueryClient();
  const first = toTrashedPrompt(createPrompt('first', 1), 3);
  const second = toTrashedPrompt(createPrompt('second', 2), 4);
  const summaries = [toTrashedSummary(second), toTrashedSummary(first)];
  queryClient.setQueryData(promptQueryKeys.trashList(), summaries);
  queryClient.setQueryData(promptQueryKeys.trashDetail(first.id), first);
  queryClient.setQueryData(promptQueryKeys.trashDetail(second.id), second);
  queryClient.setQueryData(promptQueryKeys.detail(first.id), first);
  queryClient.setQueryData(promptQueryKeys.detail(second.id), second);

  removePromptFromTrashCaches(queryClient, first.id);
  assert.deepEqual(queryClient.getQueryData(promptQueryKeys.trashList()), [summaries[0]]);
  assert.equal(queryClient.getQueryData(promptQueryKeys.trashDetail(first.id)), undefined);
  assert.equal(queryClient.getQueryData(promptQueryKeys.detail(first.id)), undefined);

  emptyPromptTrashCaches(queryClient, [second.id]);
  assert.deepEqual(queryClient.getQueryData(promptQueryKeys.trashList()), []);
  assert.equal(queryClient.getQueryData(promptQueryKeys.trashDetail(second.id)), undefined);
  assert.equal(queryClient.getQueryData(promptQueryKeys.detail(second.id)), undefined);
});
