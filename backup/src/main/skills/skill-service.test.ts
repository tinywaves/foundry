import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import type { SkillDiscoveryCoordinator } from './skill-discovery-coordinator';
import type { SkillFileCoordinator } from './skill-file-coordinator';
import type { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import { SkillInstallationRepository } from './skill-installation-repository';
import { SkillMetadataRepository } from './skill-metadata-repository';
import type { SkillRemoteDiscoveryCoordinator } from './skill-remote-discovery-coordinator';
import { SkillService } from './skill-service';
import type { SkillSourceRepository } from './skill-source-repository';
import type { SkillStoreCoordinator } from './skill-store-coordinator';
import { normalizeResolvedPathKey, resolvePhysicalPath } from './skill-target-adapters';
import type { SkillTargetMutationCoordinator } from './skill-target-mutation-coordinator';
import { SkillTargetRepository } from './skill-target-repository';
import type { SkillTrashCoordinator } from './skill-trash-coordinator';
import type { SkillUpdateCoordinator } from './skill-update-coordinator';

const packageId = '00000000-0000-4000-8000-000000001101';
const targetId = '00000000-0000-4000-8000-000000001102';
const installationId = '00000000-0000-4000-8000-000000001103';
const currentFingerprint = `v2:${'a'.repeat(64)}`;
const nextFingerprint = `v2:${'b'.repeat(64)}`;

test('derives Installation currentness from database fingerprints without Target reads', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-service-'));
  const targetRoot = path.join(temporaryRoot, 'target');
  const database = openFoundryDatabase(':memory:');
  try {
    await mkdir(targetRoot);
    const metadataRepository = new SkillMetadataRepository(database);
    metadataRepository.createImportedPackage({
      id: packageId,
      distributionName: 'shared-skill',
      fingerprint: currentFingerprint,
      content: Buffer.from('current-blob'),
      createdAt: 10,
    });
    const targetRepository = new SkillTargetRepository(database, {
      createId: () => targetId,
      now: () => 10,
    });
    const resolvedPath = await resolvePhysicalPath(targetRoot);
    targetRepository.createCustomTarget({
      displayName: 'Custom Target',
      configuredPath: targetRoot,
      resolvedPath,
      resolvedPathKey: normalizeResolvedPathKey(resolvedPath),
      isWritable: true,
      enabled: true,
      maxScanDepth: 4,
      allowSymlinkEscape: true,
    });
    const installationRepository = new SkillInstallationRepository(database);
    installationRepository.recordDistribution({
      installationId,
      packageId,
      targetId,
      distributionName: 'shared-skill',
      relativePath: 'shared-skill',
      fingerprint: currentFingerprint,
      distributedAt: 10,
    });
    const revealed: string[] = [];
    const service = new SkillService({
      metadataRepository,
      targetRepository,
      installationRepository,
      storeCoordinator: {} as SkillStoreCoordinator,
      sourceRepository: {} as SkillSourceRepository,
      gitSourceCoordinator: { releaseOwner: async () => {} } as unknown as SkillGitSourceCoordinator,
      remoteDiscoveryCoordinator: { releaseOwner: () => {} } as unknown as SkillRemoteDiscoveryCoordinator,
      updateCoordinator: {} as SkillUpdateCoordinator,
      discoveryCoordinator: {} as SkillDiscoveryCoordinator,
      fileCoordinator: {} as SkillFileCoordinator,
      targetMutationCoordinator: {} as SkillTargetMutationCoordinator,
      trashCoordinator: {} as SkillTrashCoordinator,
      resolveBuiltInTargets: () => Promise.resolve([]),
      revealPath: (targetPath) => {
        revealed.push(targetPath);
      },
      openExternal: () => {},
    });

    assert.equal(service.listStorePackages()[0]?.fingerprint, currentFingerprint);
    assert.equal(
      service.listInstallations({ skillId: packageId })[0]?.distributionStatus,
      'current',
    );
    metadataRepository.replacePackageContent({
      packageId,
      distributionName: 'shared-skill',
      fingerprint: nextFingerprint,
      content: Buffer.from('next-blob'),
      updatedAt: 20,
    });
    assert.equal(
      service.listInstallations({ skillId: packageId })[0]?.distributionStatus,
      'needs-distribution',
    );
    await service.revealTarget(targetId);
    assert.deepEqual(revealed, [targetRoot]);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
