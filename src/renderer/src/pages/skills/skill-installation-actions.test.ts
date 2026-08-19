import assert from 'node:assert/strict';
import { test } from 'vitest';
import type {
  SkillContentObservation,
  SkillDistributionTargetResult,
  SkillInstallationView,
} from '../../../../shared/skill-contract';
import {
  getSkillInstallationActions,
  summarizeSkillDistributionResults,
} from './skill-installation-actions';

const availableStore = {
  status: 'available' as const,
  fingerprint: 'a'.repeat(64),
  observedAt: 1,
};

function createInstallation(input: {
  store?: SkillContentObservation;
  target?: SkillContentObservation;
  syncStatus?: SkillInstallationView['syncStatus'];
} = {}): SkillInstallationView {
  return {
    id: 'installation',
    packageId: 'package',
    targetId: 'target',
    distributionName: 'package',
    relativePath: 'package',
    storeObservation: input.store ?? availableStore,
    targetObservation: input.target ?? availableStore,
    distribution: null,
    syncStatus: input.syncStatus ?? 'synced',
    createdAt: 1,
    updatedAt: 1,
  };
}

test('offers actions from current Store and Target capabilities', () => {
  const different = createInstallation({
    target: { status: 'available', fingerprint: 'b'.repeat(64), observedAt: 2 },
    syncStatus: 'different',
  });
  assert.deepEqual(
    getSkillInstallationActions(createInstallation()),
    ['uninstall'],
  );
  assert.deepEqual(
    getSkillInstallationActions(different),
    ['restore', 'promote', 'import-as-new', 'uninstall'],
  );
  assert.deepEqual(
    getSkillInstallationActions(createInstallation({
      target: { status: 'missing', observedAt: 2 },
      syncStatus: 'different',
    })),
    ['restore', 'uninstall'],
  );
  assert.deepEqual(
    getSkillInstallationActions(createInstallation({
      target: { status: 'unreadable', observedAt: 2 },
      syncStatus: 'unknown',
    })),
    ['restore'],
  );
  assert.deepEqual(
    getSkillInstallationActions(createInstallation({
      store: { status: 'missing', observedAt: 2 },
      syncStatus: 'unknown',
    })),
    ['promote', 'import-as-new', 'uninstall'],
  );
  assert.deepEqual(
    getSkillInstallationActions(createInstallation({
      store: { status: 'missing', observedAt: 2 },
      target: { status: 'missing', observedAt: 2 },
      syncStatus: 'unknown',
    })),
    ['uninstall'],
  );
});

test('summarizes complete success, complete failure, and partial distribution', () => {
  const success = {
    targetId: 'target-1',
    ok: true,
    installation: {},
    revisionId: 'revision-1',
  } as unknown as SkillDistributionTargetResult;
  const failure = {
    targetId: 'target-2',
    ok: false,
    error: { code: 'conflict', message: 'Occupied' },
  } satisfies SkillDistributionTargetResult;
  assert.deepEqual(summarizeSkillDistributionResults([success]), {
    succeeded: 1,
    failed: 0,
    isPartial: false,
  });
  assert.deepEqual(summarizeSkillDistributionResults([failure]), {
    succeeded: 0,
    failed: 1,
    isPartial: false,
  });
  assert.deepEqual(summarizeSkillDistributionResults([success, failure]), {
    succeeded: 1,
    failed: 1,
    isPartial: true,
  });
});
