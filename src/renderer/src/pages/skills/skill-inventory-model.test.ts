import assert from 'node:assert/strict';
import { test } from 'vitest';
import type {
  SkillInstallationView,
  SkillStorePackageView,
  SkillTargetKind,
  SkillTargetView,
} from '../../../../shared/skill-contract';
import {
  buildSkillTargetInventory,
  filterSkillStorePackages,
  getInstallationStatusPresentation,
  getTargetInstallationPresentation,
  isCodexLegacyTarget,
  orderSkillTargets,
} from './skill-inventory-model';

function createPackage(id: string, distributionName: string): SkillStorePackageView {
  return { id, distributionName, fingerprint: 'v2:abc', createdAt: 1, updatedAt: 1 };
}

function createTarget(id: string, kind: SkillTargetKind, sortOrder: number): SkillTargetView {
  return {
    id,
    kind,
    displayName: kind,
    configuredPath: `/targets/${id}`,
    documentationUrl: kind === 'codex-legacy' ? 'https://example.com/codex' : null,
    brandingKey: kind,
    hint: kind === 'codex-legacy' ? 'Legacy' : null,
    builtIn: kind !== 'custom',
    writable: true,
    enabled: true,
    policySource: 'adapter-default',
    maxScanDepth: 4,
    allowSymlinkEscape: true,
    sortOrder,
  };
}

function createInstallation(
  id: string,
  targetId: string,
  packageId: string,
  distributionStatus: SkillInstallationView['distributionStatus'] = 'current',
): SkillInstallationView {
  return {
    id,
    targetId,
    packageId,
    distributionName: packageId,
    relativePath: packageId,
    distributedFingerprint: distributionStatus === 'current' ? 'v2:current' : 'v2:old',
    distributionStatus,
    createdAt: 1,
    updatedAt: 1,
  };
}

test('filters Store metadata without requiring content state', () => {
  const packages = [createPackage('1', 'Code Review'), createPackage('2', 'Release Notes')];
  assert.deepEqual(
    filterSkillStorePackages(packages, ' review ').map((item) => item.id),
    ['1'],
  );
});

test('presents only current, needs Distribution, and not installed states', () => {
  assert.deepEqual(getInstallationStatusPresentation(
    createInstallation('1', 'target', 'package'),
  ), { label: 'Current', variant: 'success' });
  assert.deepEqual(getTargetInstallationPresentation(
    createInstallation('2', 'target', 'package', 'needs-distribution'),
  ), { label: 'Needs distribution', variant: 'warning' });
  assert.deepEqual(getTargetInstallationPresentation(undefined), {
    label: 'Not installed',
    variant: 'neutral',
  });
});

test('orders Targets and counts fingerprint-derived Installation states', () => {
  const legacy = createTarget('legacy', 'codex-legacy', 0);
  const target = createTarget('target', 'custom', 10);
  assert.deepEqual(orderSkillTargets([legacy, target]).map((item) => item.id), [
    'target',
    'legacy',
  ]);
  assert.equal(isCodexLegacyTarget(legacy), true);

  const inventory = buildSkillTargetInventory([target], [
    createInstallation('1', target.id, 'package-1'),
    createInstallation('2', target.id, 'package-1', 'needs-distribution'),
    createInstallation('3', target.id, 'package-2'),
  ]);
  assert.equal(inventory[0]?.packageCount, 2);
  assert.deepEqual(inventory[0]?.statusCounts, {
    'Current': 2,
    'Needs distribution': 1,
  });
});
