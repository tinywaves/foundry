import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { SkillDistributionTargetResult } from '../../../../shared/skill-contract';
import {
  getSkillInstallationActions,
  summarizeSkillDistributionResults,
} from './skill-installation-actions';

test('offers only actions meaningful for each derived installation state', () => {
  assert.deepEqual(
    getSkillInstallationActions({ kind: 'known', state: 'synced' }),
    ['uninstall'],
  );
  assert.deepEqual(
    getSkillInstallationActions({ kind: 'known', state: 'outdated' }),
    ['restore', 'uninstall'],
  );
  assert.deepEqual(
    getSkillInstallationActions({ kind: 'known', state: 'drifted' }),
    ['restore', 'promote', 'import-as-new', 'uninstall'],
  );
  assert.deepEqual(
    getSkillInstallationActions({ kind: 'known', state: 'diverged' }),
    ['restore', 'promote', 'import-as-new', 'uninstall'],
  );
  assert.deepEqual(
    getSkillInstallationActions({ kind: 'known', state: 'missing' }),
    ['restore', 'uninstall'],
  );
  assert.deepEqual(
    getSkillInstallationActions({ kind: 'unavailable', reason: 'target-unreadable' }),
    [],
  );
  assert.deepEqual(
    getSkillInstallationActions({ kind: 'unavailable', reason: 'store-missing' }),
    ['promote', 'import-as-new', 'uninstall'],
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
