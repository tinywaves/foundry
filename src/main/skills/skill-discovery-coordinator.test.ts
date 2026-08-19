import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillDiscoveryCoordinator } from './skill-discovery-coordinator';
import { SkillInstallationRepository } from './skill-installation-repository';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillStorePaths } from './skill-store-paths';
import { SkillTargetRepository } from './skill-target-repository';

const targetIds = [
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000304',
  '00000000-0000-4000-8000-000000000305',
  '00000000-0000-4000-8000-000000000306',
  '00000000-0000-4000-8000-000000000307',
  '00000000-0000-4000-8000-000000000308',
  '00000000-0000-4000-8000-000000000309',
];
const packageId = '00000000-0000-4000-8000-000000000310';
const revisionId = '00000000-0000-4000-8000-000000000311';
const operationId = '00000000-0000-4000-8000-000000000312';
const installationId = '00000000-0000-4000-8000-000000000313';
const distributionRecordId = '00000000-0000-4000-8000-000000000314';

test('imports, adopts, updates, and treats a missing Target root as an empty scan', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-discovery-'));
  const genericRoot = path.join(userHome, '.agents', 'skills');
  const candidate = path.join(genericRoot, 'runtime-skill');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(candidate, { recursive: true });
    await writeFile(path.join(candidate, 'SKILL.md'), '# Runtime installed\n');
    const targetIdQueue = [...targetIds];
    let now = 1000;
    const targetRepository = new SkillTargetRepository(database, {
      createId: () => targetIdQueue.shift()!,
      now: () => now,
    });
    const installationIds = [installationId, distributionRecordId];
    const installationRepository = new SkillInstallationRepository(database, {
      createId: () => installationIds.shift()!,
      now: () => now,
    });
    const storeIds = [packageId, revisionId, operationId];
    const storeCoordinator = new SkillStoreCoordinator(
      new SkillStorePaths(userHome),
      new SkillMetadataRepository(database),
      {
        createId: () => storeIds.shift()!,
        now: () => now,
      },
    );
    await storeCoordinator.initialize();
    const discovery = new SkillDiscoveryCoordinator({
      userHomeDirectory: userHome,
      environment: {},
      targetRepository,
      installationRepository,
      storeCoordinator,
      now: () => now,
    });

    const initial = await discovery.scan();
    const genericTarget = targetRepository.listTargets()
      .find((target) => target.kind === 'generic-agent-skills')!;
    const adopted = installationRepository.listActiveInstallations(genericTarget.id)[0];
    assert.equal(initial.packagesImported, 1);
    assert.equal(initial.installationsAdopted, 1);
    assert.equal(adopted.id, installationId);
    assert.equal(adopted.packageId, packageId);
    assert.equal(adopted.relativePath, 'runtime-skill');

    now = 1100;
    await writeFile(path.join(candidate, 'SKILL.md'), '# Externally modified\n');
    const changed = await discovery.scan();
    const changedInstallation = installationRepository.listActiveInstallations(genericTarget.id)[0];
    assert.equal(changed.packagesImported, 0);
    assert.equal(changed.installationsAdopted, 0);
    assert.equal(changed.observationsUpdated, 1);
    assert.equal(changedInstallation.id, installationId);
    assert.notDeepEqual(changedInstallation.targetObservation, adopted.targetObservation);

    now = 1200;
    await rm(genericRoot, { recursive: true });
    const missingRoot = await discovery.scan();
    const staleInstallation = installationRepository.listActiveInstallations(genericTarget.id)[0];
    assert.equal(
      missingRoot.roots.find((root) => root.targetId === genericTarget.id)?.status,
      'missing',
    );
    assert.deepEqual(missingRoot.rootFailures, []);
    assert.deepEqual(staleInstallation.targetObservation, changedInstallation.targetObservation);

    now = 1250;
    await writeFile(genericRoot, 'not a directory');
    const unreadableRoot = await discovery.scan();
    assert.deepEqual(unreadableRoot.rootFailures, [
      {
        targetId: genericTarget.id,
        status: 'unreadable',
      },
    ]);

    now = 1300;
    await rm(genericRoot);
    await mkdir(genericRoot, { recursive: true });
    const missing = await discovery.scan();
    const missingInstallation = installationRepository.listActiveInstallations(genericTarget.id)[0];
    assert.equal(missing.observationsUpdated, 1);
    assert.deepEqual(missingInstallation.targetObservation, {
      status: 'missing',
      observedAt: 1300,
    });
  } finally {
    database.close();
    await rm(userHome, { recursive: true, force: true });
  }
});

test('reuses one Skill ID while adopting identical content in two physical Targets', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-discovery-deduplicate-'));
  const genericCandidate = path.join(userHome, '.agents', 'skills', 'shared-skill');
  const claudeCandidate = path.join(userHome, '.claude', 'skills', 'shared-skill');
  const database = openFoundryDatabase(':memory:');

  try {
    await Promise.all([
      mkdir(genericCandidate, { recursive: true }),
      mkdir(claudeCandidate, { recursive: true }),
    ]);
    await Promise.all([
      writeFile(path.join(genericCandidate, 'SKILL.md'), '# Identical\n'),
      writeFile(path.join(claudeCandidate, 'SKILL.md'), '# Identical\n'),
    ]);
    const targetIdQueue = [...targetIds];
    const targetRepository = new SkillTargetRepository(database, {
      createId: () => targetIdQueue.shift()!,
      now: () => 1300,
    });
    const installationIds = [
      installationId,
      distributionRecordId,
      '00000000-0000-4000-8000-000000000315',
      '00000000-0000-4000-8000-000000000316',
    ];
    const installationRepository = new SkillInstallationRepository(database, {
      createId: () => installationIds.shift()!,
      now: () => 1300,
    });
    const storeIds = [packageId, revisionId, operationId];
    const metadataRepository = new SkillMetadataRepository(database);
    const storeCoordinator = new SkillStoreCoordinator(
      new SkillStorePaths(userHome),
      metadataRepository,
      {
        createId: () => storeIds.shift()!,
        now: () => 1300,
      },
    );
    await storeCoordinator.initialize();
    const discovery = new SkillDiscoveryCoordinator({
      userHomeDirectory: userHome,
      environment: {},
      targetRepository,
      installationRepository,
      storeCoordinator,
      now: () => 1300,
    });

    const result = await discovery.scan();

    assert.equal(result.packagesImported, 1);
    assert.equal(result.installationsAdopted, 2);
    assert.equal(metadataRepository.listActivePackages().length, 1);
    const installations = installationRepository.listActiveInstallations();
    assert.equal(installations.length, 2);
    assert.deepEqual(new Set(installations.map((entry) => entry.packageId)), new Set([packageId]));
    assert.equal(new Set(installations.map((entry) => entry.targetId)).size, 2);
  } finally {
    database.close();
    await rm(userHome, { recursive: true, force: true });
  }
});

test('keeps same-name packages with different content as distinct Skills across Targets', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-discovery-name-conflict-'));
  const genericCandidate = path.join(userHome, '.agents', 'skills', 'shared-name');
  const claudeCandidate = path.join(userHome, '.claude', 'skills', 'shared-name');
  const database = openFoundryDatabase(':memory:');

  try {
    await Promise.all([
      mkdir(genericCandidate, { recursive: true }),
      mkdir(claudeCandidate, { recursive: true }),
    ]);
    await Promise.all([
      writeFile(path.join(genericCandidate, 'SKILL.md'), '# Generic content\n'),
      writeFile(path.join(claudeCandidate, 'SKILL.md'), '# Claude content\n'),
    ]);
    const targetIdQueue = [...targetIds];
    const targetRepository = new SkillTargetRepository(database, {
      createId: () => targetIdQueue.shift()!,
      now: () => 1400,
    });
    const installationIds = [
      '00000000-0000-4000-8000-000000000321',
      '00000000-0000-4000-8000-000000000322',
      '00000000-0000-4000-8000-000000000323',
      '00000000-0000-4000-8000-000000000324',
    ];
    const installationRepository = new SkillInstallationRepository(database, {
      createId: () => installationIds.shift()!,
      now: () => 1400,
    });
    const storeIds = [
      '00000000-0000-4000-8000-000000000325',
      '00000000-0000-4000-8000-000000000326',
      '00000000-0000-4000-8000-000000000327',
      '00000000-0000-4000-8000-000000000328',
      '00000000-0000-4000-8000-000000000329',
      '00000000-0000-4000-8000-000000000330',
    ];
    const metadataRepository = new SkillMetadataRepository(database);
    const storeCoordinator = new SkillStoreCoordinator(
      new SkillStorePaths(userHome),
      metadataRepository,
      {
        createId: () => storeIds.shift()!,
        now: () => 1400,
      },
    );
    await storeCoordinator.initialize();
    const discovery = new SkillDiscoveryCoordinator({
      userHomeDirectory: userHome,
      environment: {},
      targetRepository,
      installationRepository,
      storeCoordinator,
      now: () => 1400,
    });

    const result = await discovery.scan();

    assert.equal(result.packagesImported, 2);
    assert.equal(result.installationsAdopted, 2);
    const packages = metadataRepository.listActivePackages();
    assert.equal(packages.length, 2);
    assert.equal(packages.every((entry) => entry.distributionName === 'shared-name'), true);
    const fingerprints = packages.map((entry) => (
      entry.storeObservation.status === 'available'
        ? entry.storeObservation.fingerprint
        : null
    ));
    assert.equal(new Set(fingerprints).size, 2);
  } finally {
    database.close();
    await rm(userHome, { recursive: true, force: true });
  }
});
