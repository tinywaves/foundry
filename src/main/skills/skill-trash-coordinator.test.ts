import assert from 'node:assert/strict';
import type { Buffer } from 'node:buffer';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillInstallationRepository } from './skill-installation-repository';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillOperationQueue } from './skill-operation-queue';
import { normalizeResolvedPathKey, resolvePhysicalPath } from './skill-target-adapters';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import type { SkillTargetMetadata } from './skill-target-repository';
import { SkillTargetRepository } from './skill-target-repository';
import { SkillTrashCoordinator } from './skill-trash-coordinator';

const packageId = '00000000-0000-4000-8000-000000000901';
const targetIds = [
  '00000000-0000-4000-8000-000000000902',
  '00000000-0000-4000-8000-000000000903',
];
const installationIds = [
  '00000000-0000-4000-8000-000000000904',
  '00000000-0000-4000-8000-000000000905',
];

test('partial Store Deletion keeps metadata intact and retry completes atomically', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-delete-'));
  const source = path.join(temporaryRoot, 'source');
  const targetRoots = [path.join(temporaryRoot, 'first'), path.join(temporaryRoot, 'second')];
  const database = openFoundryDatabase(':memory:');
  try {
    await Promise.all([mkdir(source), ...targetRoots.map((root) => mkdir(root))]);
    await writeFile(path.join(source, 'SKILL.md'), '# Delete me\n');
    const metadataRepository = new SkillMetadataRepository(database);
    const storeCoordinator = new SkillStoreCoordinator(metadataRepository, {
      createId: () => packageId,
      now: () => 100,
    });
    const imported = await storeCoordinator.importPackage(source);
    const skillPackage = imported.package;
    const targetIdQueue = [...targetIds];
    const targetRepository = new SkillTargetRepository(database, {
      createId: () => targetIdQueue.shift()!,
      now: () => 100,
    });
    const targets: SkillTargetMetadata[] = [];
    for (const [index, root] of targetRoots.entries()) {
      const resolvedPath = await resolvePhysicalPath(root);
      targets.push(targetRepository.createCustomTarget({
        displayName: `Target ${index + 1}`,
        configuredPath: root,
        resolvedPath,
        resolvedPathKey: normalizeResolvedPathKey(resolvedPath),
        isWritable: true,
        enabled: true,
        maxScanDepth: 4,
        allowSymlinkEscape: true,
      }).target);
      await mkdir(path.join(root, 'delete-me'));
      await writeFile(path.join(root, 'delete-me', 'SKILL.md'), '# Projection\n');
    }
    const installationRepository = new SkillInstallationRepository(database);
    for (const [index, target] of targets.entries()) {
      installationRepository.recordDistribution({
        installationId: installationIds[index],
        packageId,
        targetId: target.id,
        distributionName: 'delete-me',
        relativePath: 'delete-me',
        fingerprint: skillPackage.fingerprint,
        distributedAt: 150,
      });
    }

    let isFailSecondTarget = true;
    const coordinator = new SkillTrashCoordinator({
      metadataRepository,
      installationRepository,
      targetRepository,
      operationQueue: new SkillOperationQueue(),
      now: () => 200,
      removePath: async (targetPath) => {
        if (isFailSecondTarget && targetPath.endsWith(`${path.sep}second${path.sep}delete-me`)) {
          isFailSecondTarget = false;
          throw new Error('Injected removal failure');
        }
        await rm(targetPath, { recursive: true, force: true });
      },
    });

    const preflight = await coordinator.preflightStoreDeletion(packageId);
    assert.deepEqual(preflight.targets.map((target) => target.status), ['ready', 'ready']);
    const partial = await coordinator.movePackageToTrash(packageId);
    assert.equal(partial.deleted, false);
    assert.equal(partial.failures.length, 1);
    assert.equal(metadataRepository.getActivePackage(packageId).id, packageId);
    assert.equal(installationRepository.listActiveInstallationsForPackage(packageId).length, 2);

    const retryPreflight = await coordinator.preflightStoreDeletion(packageId);
    assert.deepEqual(retryPreflight.targets.map((target) => target.status), ['missing', 'ready']);
    const completed = await coordinator.movePackageToTrash(packageId);
    assert.equal(completed.deleted, true);
    assert.equal(completed.failures.length, 0);
    assert.equal(metadataRepository.getTrashedPackage(packageId).id, packageId);
    assert.equal(installationRepository.listActiveInstallationsForPackage(packageId).length, 0);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('Restore and Remove from Foundry are metadata-only and retain the BLOB', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-trash-retention-'));
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');
  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Retained\n');
    const metadataRepository = new SkillMetadataRepository(database);
    const storeCoordinator = new SkillStoreCoordinator(metadataRepository, {
      createId: () => packageId,
      now: () => 100,
    });
    const imported = await storeCoordinator.importPackage(source);
    const skillPackage = imported.package;
    metadataRepository.commitStoreDeletion(packageId, 200);
    metadataRepository.restoreTrashedPackage(packageId, 300);
    assert.equal(metadataRepository.getActivePackage(packageId).id, packageId);
    metadataRepository.commitStoreDeletion(packageId, 400);
    metadataRepository.markTrashedPackageRemoved(packageId, 500);

    const retained = database.prepare<[string], { content_blob: Buffer; content_fingerprint: string }>(`
      SELECT content_blob, content_fingerprint FROM skill_packages WHERE id = ?
    `).get(packageId);
    assert.ok(retained);
    assert.ok(retained.content_blob.length);
    assert.equal(retained.content_fingerprint, skillPackage.fingerprint);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
