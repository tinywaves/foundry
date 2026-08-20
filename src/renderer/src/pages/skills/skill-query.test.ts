import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { test } from 'vitest';
import type {
  SkillApiError,
  SkillStorePackageView,
  SkillTrashPackageView,
} from '../../../../shared/skill-contract';
import {
  emptySkillTrashCaches,
  invalidateSkillQueries,
  moveSkillPackageToTrashCaches,
  removeSkillPackageFromTrashCaches,
  resolveSkillRequest,
  restoreSkillPackageCaches,
  shouldRetrySkillRead,
  skillQueryKeys,
  SkillRequestError,
} from './skill-query';

test('isolates Skill query keys by inventory resource and filters', () => {
  assert.deepEqual(skillQueryKeys.storePackages(), ['skills', 'store-packages']);
  assert.deepEqual(
    skillQueryKeys.storePackage('skill-1'),
    ['skills', 'store-package', 'skill-1'],
  );
  assert.deepEqual(
    skillQueryKeys.packageFile('skill-1', 'references/guide.md'),
    ['skills', 'package-files', 'skill-1', 'references/guide.md'],
  );
  assert.deepEqual(skillQueryKeys.trash(), ['skills', 'trash']);
  assert.deepEqual(skillQueryKeys.targets(), ['skills', 'targets']);
  assert.deepEqual(
    skillQueryKeys.installations(),
    ['skills', 'installations', null, null],
  );
  assert.deepEqual(
    skillQueryKeys.installations({ skillId: 'skill-1', targetId: 'target-1' }),
    ['skills', 'installations', 'skill-1', 'target-1'],
  );
});

test('adapts Skill API errors and unexpected rejections', async () => {
  const apiError: SkillApiError = {
    code: 'content-unavailable',
    message: 'Store package is unavailable.',
  };
  await assert.rejects(
    resolveSkillRequest(
      () => Promise.resolve({ ok: false, error: apiError }),
      'Fallback',
    ),
    (error: unknown) => error instanceof SkillRequestError
      && error.apiError === apiError,
  );
  await assert.rejects(
    resolveSkillRequest(
      () => Promise.reject(new Error('IPC unavailable')),
      'Fallback',
    ),
    (error: unknown) => error instanceof SkillRequestError
      && error.message === 'Fallback'
      && error.apiError === undefined,
  );
});

test('retries reads once only for transient failures', () => {
  for (const code of ['filesystem-unavailable', 'storage-unavailable', 'internal'] as const) {
    assert.equal(
      shouldRetrySkillRead(0, new SkillRequestError('Transient', { code, message: 'Transient' })),
      true,
    );
  }
  assert.equal(shouldRetrySkillRead(0, new SkillRequestError('Unexpected')), true);
  assert.equal(
    shouldRetrySkillRead(1, new SkillRequestError('Transient', {
      code: 'storage-unavailable',
      message: 'Transient',
    })),
    false,
  );
  assert.equal(
    shouldRetrySkillRead(0, new SkillRequestError('Terminal', {
      code: 'storage-corrupt',
      message: 'Terminal',
    })),
    false,
  );
  assert.equal(shouldRetrySkillRead(0, new Error('Unknown')), false);
});

test('invalidates only Skills cache entries', async () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(skillQueryKeys.storePackages(), []);
  queryClient.setQueryData(['providers', 'list', 'codex'], []);

  await invalidateSkillQueries(queryClient);

  assert.equal(
    queryClient.getQueryState(skillQueryKeys.storePackages())?.isInvalidated,
    true,
  );
  assert.equal(
    queryClient.getQueryState(['providers', 'list', 'codex'])?.isInvalidated,
    false,
  );
});

test('keeps Store and Trash caches coherent across the deletion lifecycle', () => {
  const queryClient = new QueryClient();
  const storePackage: SkillStorePackageView = {
    id: 'skill-1',
    distributionName: 'shared-skill',
    description: null,
    fingerprint: 'v2:abc',
    createdAt: 10,
    updatedAt: 10,
  };
  const trashedPackage: SkillTrashPackageView = {
    id: storePackage.id,
    distributionName: storePackage.distributionName,
    description: storePackage.description,
    fingerprint: storePackage.fingerprint,
    createdAt: storePackage.createdAt,
    updatedAt: 20,
    trashedAt: 20,
  };
  queryClient.setQueryData(skillQueryKeys.storePackages(), [storePackage]);
  queryClient.setQueryData(skillQueryKeys.storePackage(storePackage.id), storePackage);
  queryClient.setQueryData(skillQueryKeys.packageFiles(storePackage.id), []);
  queryClient.setQueryData(skillQueryKeys.trash(), []);

  moveSkillPackageToTrashCaches(queryClient, trashedPackage);

  assert.deepEqual(queryClient.getQueryData(skillQueryKeys.storePackages()), []);
  assert.equal(
    queryClient.getQueryData(skillQueryKeys.storePackage(storePackage.id)),
    undefined,
  );
  assert.equal(
    queryClient.getQueryData(skillQueryKeys.packageFiles(storePackage.id)),
    undefined,
  );
  assert.deepEqual(queryClient.getQueryData(skillQueryKeys.trash()), [trashedPackage]);

  const restoredPackage = { ...storePackage, updatedAt: 30 };
  restoreSkillPackageCaches(queryClient, restoredPackage);

  assert.deepEqual(queryClient.getQueryData(skillQueryKeys.trash()), []);
  assert.deepEqual(
    queryClient.getQueryData(skillQueryKeys.storePackages()),
    [restoredPackage],
  );
  assert.deepEqual(
    queryClient.getQueryData(skillQueryKeys.storePackage(storePackage.id)),
    restoredPackage,
  );

  queryClient.setQueryData(skillQueryKeys.trash(), [
    trashedPackage,
    { ...trashedPackage, id: 'skill-2' },
    { ...trashedPackage, id: 'skill-3' },
  ]);
  removeSkillPackageFromTrashCaches(queryClient, 'skill-1');
  emptySkillTrashCaches(queryClient, {
    removedIds: ['skill-2'],
    failures: [
      {
        skillId: 'skill-3',
        error: { code: 'filesystem-unavailable', message: 'Unavailable' },
      },
    ],
  });
  assert.deepEqual(
    queryClient.getQueryData<SkillTrashPackageView[]>(skillQueryKeys.trash())
      ?.map((item) => item.id),
    ['skill-3'],
  );
});
