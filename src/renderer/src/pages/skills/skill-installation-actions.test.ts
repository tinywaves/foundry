import assert from 'node:assert/strict';
import { test } from 'vitest';
import type {
  SkillDistributionTargetResult,
  SkillInstallationView,
} from '../../../../shared/skill-contract';
import {
  getSkillInstallationActions,
  summarizeSkillDistributionResults,
} from './skill-installation-actions';

const installation: SkillInstallationView = {
  id: 'installation',
  packageId: 'package',
  targetId: 'target',
  distributionName: 'package',
  relativePath: 'package',
  distributedFingerprint: 'v2:abc',
  distributionStatus: 'needs-distribution',
  createdAt: 1,
  updatedAt: 1,
};

test('offers only Uninstall for a Target projection', () => {
  assert.deepEqual(getSkillInstallationActions(installation), ['uninstall']);
});

test('summarizes complete and partial Distribution results', () => {
  const success = {
    targetId: 'target-1',
    ok: true,
    installation,
  } satisfies SkillDistributionTargetResult;
  const failure = {
    targetId: 'target-2',
    ok: false,
    error: { code: 'conflict', message: 'Unavailable' },
  } satisfies SkillDistributionTargetResult;
  assert.deepEqual(summarizeSkillDistributionResults([success]), {
    succeeded: 1,
    failed: 0,
    isPartial: false,
  });
  assert.deepEqual(summarizeSkillDistributionResults([success, failure]), {
    succeeded: 1,
    failed: 1,
    isPartial: true,
  });
});
