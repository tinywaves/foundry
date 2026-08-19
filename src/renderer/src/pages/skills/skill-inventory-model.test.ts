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
  getStoreObservationPresentation,
  getTargetInstallationPresentation,
  isCodexLegacyTarget,
  orderSkillTargets,
} from './skill-inventory-model';

function createPackage(id: string, distributionName: string): SkillStorePackageView {
  return {
    id,
    distributionName,
    storeObservation: { status: 'available', fingerprint: 'a'.repeat(64), observedAt: 1 },
    createdAt: 1,
    updatedAt: 1,
  };
}

function createTarget(
  id: string,
  kind: SkillTargetKind,
  sortOrder: number,
): SkillTargetView {
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
    allowSymlinkEscape: false,
    sortOrder,
  };
}

function createInstallation(
  id: string,
  targetId: string,
  packageId: string,
  overrides: Partial<Pick<
    SkillInstallationView,
    'storeObservation' | 'targetObservation' | 'syncStatus'
  >> = {},
): SkillInstallationView {
  return {
    id,
    targetId,
    packageId,
    distributionName: packageId,
    relativePath: packageId,
    storeObservation: { status: 'available', fingerprint: 'a'.repeat(64), observedAt: 1 },
    targetObservation: { status: 'available', fingerprint: 'a'.repeat(64), observedAt: 1 },
    distribution: null,
    syncStatus: 'synced',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

test('filters Store packages by displayed Distribution Name', () => {
  const packages = [createPackage('1', 'Code Review'), createPackage('2', 'Release Notes')];
  assert.deepEqual(
    filterSkillStorePackages(packages, ' review ').map((item) => item.id),
    ['1'],
  );
  assert.deepEqual(filterSkillStorePackages(packages, ''), packages);
});

test('maps Store observations and installation facts without claiming validity', () => {
  assert.deepEqual(getStoreObservationPresentation('available'), {
    label: 'Available',
    variant: 'success',
  });
  assert.equal(getStoreObservationPresentation('unreadable').label, 'Unreadable');
  const different = createInstallation('installation', 'target', 'package', {
    targetObservation: { status: 'available', fingerprint: 'b'.repeat(64), observedAt: 2 },
    syncStatus: 'different',
  });
  assert.equal(
    getInstallationStatusPresentation(different).label,
    'Different',
  );
  const unreadable = createInstallation('installation', 'target', 'package', {
    targetObservation: { status: 'unreadable', observedAt: 2 },
    syncStatus: 'unknown',
  });
  assert.equal(
    getInstallationStatusPresentation(unreadable).label,
    'Unreadable',
  );
});

test('presents installation presence independently from card selection', () => {
  const missing = createInstallation(
    'installation',
    'target',
    'package',
    {
      targetObservation: { status: 'missing', observedAt: 1 },
      syncStatus: 'different',
    },
  );
  const installed: SkillInstallationView = {
    ...missing,
    targetObservation: {
      status: 'available',
      fingerprint: 'b'.repeat(64),
      observedAt: 2,
    },
    syncStatus: 'different',
  };
  const unreadable: SkillInstallationView = {
    ...missing,
    targetObservation: { status: 'unreadable', observedAt: 3 },
    syncStatus: 'unknown',
  };

  assert.deepEqual(getTargetInstallationPresentation(undefined), {
    label: 'Not installed',
    variant: 'neutral',
  });
  assert.deepEqual(getTargetInstallationPresentation(installed), {
    label: 'Installed',
    variant: 'success',
  });
  assert.deepEqual(getTargetInstallationPresentation(missing), {
    label: 'Missing',
    variant: 'error',
  });
  assert.deepEqual(getTargetInstallationPresentation(unreadable), {
    label: 'Unreadable',
    variant: 'warning',
  });
});

test('orders Codex Legacy last and retains its official documentation metadata', () => {
  const legacy = createTarget('legacy', 'codex-legacy', 0);
  const targets = orderSkillTargets([
    legacy,
    createTarget('custom', 'custom', 2000),
    createTarget('agents', 'generic-agent-skills', 10),
  ]);
  assert.deepEqual(targets.map((target) => target.id), ['agents', 'custom', 'legacy']);
  assert.equal(isCodexLegacyTarget(legacy), true);
  assert.equal(isCodexLegacyTarget(createTarget('codex', 'custom', 0)), false);
});

test('counts unique packages and observed installation states per physical target', () => {
  const inventory = buildSkillTargetInventory(
    [createTarget('target', 'custom', 0)],
    [
      createInstallation('1', 'target', 'package-1'),
      createInstallation('2', 'target', 'package-1', {
        targetObservation: { status: 'missing', observedAt: 1 },
        syncStatus: 'different',
      }),
      createInstallation('3', 'target', 'package-2', {
        targetObservation: { status: 'unreadable', observedAt: 1 },
        syncStatus: 'unknown',
      }),
    ],
  );
  assert.equal(inventory[0]?.packageCount, 2);
  assert.deepEqual(inventory[0]?.installations.map((item) => item.id), ['1', '2', '3']);
  assert.deepEqual(inventory[0]?.statusCounts, {
    Synced: 1,
    Missing: 1,
    Unreadable: 1,
  });
});
