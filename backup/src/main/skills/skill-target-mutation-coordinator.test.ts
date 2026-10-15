import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillInstallationRepository } from './skill-installation-repository';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillOperationQueue } from './skill-operation-queue';
import { normalizeResolvedPathKey, resolvePhysicalPath } from './skill-target-adapters';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillTargetMutationCoordinator } from './skill-target-mutation-coordinator';
import { SkillTargetRepository } from './skill-target-repository';

const packageId = '00000000-0000-4000-8000-000000000801';
const targetId = '00000000-0000-4000-8000-000000000802';
const installationId = '00000000-0000-4000-8000-000000000803';
const operationIds = [
  '00000000-0000-4000-8000-000000000804',
  '00000000-0000-4000-8000-000000000805',
  '00000000-0000-4000-8000-000000000806',
  '00000000-0000-4000-8000-000000000807',
];

async function createFixture(removePath?: (targetPath: string) => Promise<void>) {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-distribution-'));
  const source = path.join(temporaryRoot, 'source');
  const targetRoot = path.join(temporaryRoot, 'target');
  await Promise.all([mkdir(source), mkdir(targetRoot)]);
  await writeFile(path.join(source, 'SKILL.md'), '# Version one\n');
  const database = openFoundryDatabase(':memory:');
  const metadataRepository = new SkillMetadataRepository(database);
  const storeCoordinator = new SkillStoreCoordinator(metadataRepository, {
    createId: () => packageId,
    now: () => 100,
  });
  const imported = await storeCoordinator.importPackage(source);
  const targetRepository = new SkillTargetRepository(database, {
    createId: () => targetId,
    now: () => 100,
  });
  const resolvedPath = await resolvePhysicalPath(targetRoot);
  const target = targetRepository.createCustomTarget({
    displayName: 'Test Target',
    configuredPath: targetRoot,
    resolvedPath,
    resolvedPathKey: normalizeResolvedPathKey(resolvedPath),
    isWritable: true,
    enabled: true,
    maxScanDepth: 4,
    allowSymlinkEscape: true,
  }).target;
  const installationRepository = new SkillInstallationRepository(database);
  const ids = [installationId, ...operationIds];
  let now = 200;
  const coordinator = new SkillTargetMutationCoordinator({
    metadataRepository,
    targetRepository,
    installationRepository,
    storeCoordinator,
    operationQueue: new SkillOperationQueue(),
    createId: () => ids.shift()!,
    now: () => now,
    ...(removePath && { removePath }),
  });
  return {
    temporaryRoot,
    source,
    targetRoot,
    database,
    imported,
    target,
    metadataRepository,
    storeCoordinator,
    installationRepository,
    coordinator,
    setNow(value: number) {
      now = value;
    },
  };
}

test('installs current content and turns repeated Distribution into no-op', async () => {
  const fixture = await createFixture();
  try {
    const before = await fixture.coordinator.preflightDistribution({
      skillId: packageId,
      targetIds: [targetId],
    });
    const firstTarget = before.targets[0];
    if (firstTarget.status !== 'ready') {
      assert.fail('Expected a ready Target.');
    }
    assert.equal(firstTarget.operation, 'install');

    const installed = await fixture.coordinator.distribute({
      skillId: packageId,
      targetIds: [targetId],
    });
    assert.equal(installed.targets[0]?.ok, true);
    assert.equal(
      await readFile(path.join(fixture.targetRoot, 'source', 'SKILL.md'), 'utf8'),
      '# Version one\n',
    );
    const installation = fixture.installationRepository.getActiveInstallation(installationId);
    assert.equal(installation.distributedFingerprint, fixture.imported.package.fingerprint);

    const repeated = await fixture.coordinator.preflightDistribution({
      skillId: packageId,
      targetIds: [targetId],
    });
    assert.equal(repeated.targets[0]?.status === 'ready' && repeated.targets[0].operation, 'none');
  } finally {
    fixture.database.close();
    await rm(fixture.temporaryRoot, { recursive: true, force: true });
  }
});

test('failed replacement leaves the old fingerprint and retry recreates the projection', async () => {
  let isFailNextReplacement = false;
  const fixture = await createFixture(async (targetPath) => {
    await rm(targetPath, { recursive: true, force: true });
    if (isFailNextReplacement && targetPath.endsWith(`${path.sep}source`)) {
      isFailNextReplacement = false;
      throw new Error('Injected replacement failure');
    }
  });
  try {
    await fixture.coordinator.distribute({ skillId: packageId, targetIds: [targetId] });
    const oldFingerprint = fixture.imported.package.fingerprint;
    await writeFile(path.join(fixture.source, 'SKILL.md'), '# Version two\n');
    const prepared = await fixture.storeCoordinator.preparePackageContent(fixture.source, packageId);
    fixture.metadataRepository.replacePackageContent({
      packageId,
      distributionName: prepared.distributionName,
      fingerprint: prepared.encoded.fingerprint,
      content: prepared.encoded.content,
      updatedAt: 300,
    });
    const preflight = await fixture.coordinator.preflightDistribution({
      skillId: packageId,
      targetIds: [targetId],
    });
    assert.equal(preflight.targets[0]?.status === 'ready' && preflight.targets[0].operation, 'replace');

    isFailNextReplacement = true;
    const failed = await fixture.coordinator.distribute({
      skillId: packageId,
      targetIds: [targetId],
    });
    assert.equal(failed.targets[0]?.ok, false);
    assert.equal(fixture.installationRepository.getActiveInstallation(installationId)
      .distributedFingerprint, oldFingerprint);

    const retried = await fixture.coordinator.distribute({
      skillId: packageId,
      targetIds: [targetId],
    });
    assert.equal(retried.targets[0]?.ok, true);
    assert.equal(
      await readFile(path.join(fixture.targetRoot, 'source', 'SKILL.md'), 'utf8'),
      '# Version two\n',
    );
    assert.equal(fixture.installationRepository.getActiveInstallation(installationId)
      .distributedFingerprint, prepared.encoded.fingerprint);
  } finally {
    fixture.database.close();
    await rm(fixture.temporaryRoot, { recursive: true, force: true });
  }
});

test('Uninstall removes one Target projection and deactivates its Installation', async () => {
  const fixture = await createFixture();
  try {
    await fixture.coordinator.distribute({ skillId: packageId, targetIds: [targetId] });
    await fixture.coordinator.uninstall({ installationId });
    assert.equal(fixture.installationRepository.isInstallationActive(installationId), false);
    await assert.rejects(() => readFile(path.join(fixture.targetRoot, 'source', 'SKILL.md')));
    assert.equal(fixture.metadataRepository.getActivePackage(packageId).id, packageId);
  } finally {
    fixture.database.close();
    await rm(fixture.temporaryRoot, { recursive: true, force: true });
  }
});
