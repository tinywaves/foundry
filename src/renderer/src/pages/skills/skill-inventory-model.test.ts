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
  getInstallationStatePresentation,
  getStoreObservationPresentation,
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
  state: SkillInstallationView['state'],
): SkillInstallationView {
  return {
    id,
    targetId,
    packageId,
    distributionName: packageId,
    relativePath: packageId,
    targetObservation: { status: 'missing', observedAt: 1 },
    distribution: null,
    state,
    createdAt: 1,
    updatedAt: 1,
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
  assert.equal(
    getInstallationStatePresentation({ kind: 'known', state: 'outdated' }).label,
    'Outdated',
  );
  assert.equal(
    getInstallationStatePresentation({
      kind: 'unavailable',
      reason: 'target-unreadable',
    }).label,
    'Target unreadable',
  );
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
      createInstallation('1', 'target', 'package-1', { kind: 'known', state: 'synced' }),
      createInstallation('2', 'target', 'package-1', { kind: 'known', state: 'missing' }),
      createInstallation('3', 'target', 'package-2', {
        kind: 'unavailable',
        reason: 'target-unreadable',
      }),
    ],
  );
  assert.equal(inventory[0]?.packageCount, 2);
  assert.deepEqual(inventory[0]?.installations.map((item) => item.id), ['1', '2', '3']);
  assert.deepEqual(inventory[0]?.stateCounts, {
    'Synced': 1,
    'Missing': 1,
    'Target unreadable': 1,
  });
});
