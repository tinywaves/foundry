import assert from 'node:assert/strict';
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillDiscoveryCoordinator } from './skill-discovery-coordinator';
import { SkillInstallationRepository } from './skill-installation-repository';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { normalizeResolvedPathKey } from './skill-target-adapters';
import type { ResolvedBuiltInSkillTarget } from './skill-target-adapters';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillTargetRepository } from './skill-target-repository';

const targetId = '00000000-0000-4000-8000-000000000301';
const packageId = '00000000-0000-4000-8000-000000000302';
const installationId = '00000000-0000-4000-8000-000000000303';

async function createDefinition(rootPath: string): Promise<ResolvedBuiltInSkillTarget> {
  const resolvedPath = await realpath(rootPath);
  return {
    kind: 'generic-agent-skills',
    displayName: 'Agent Skills',
    brandingKey: 'agents',
    configuredPath: rootPath,
    resolvedPath,
    resolvedPathKey: normalizeResolvedPathKey(resolvedPath),
    documentationUrl: null,
    isWritable: true,
    defaultMaxScanDepth: 4,
    defaultAllowSymlinkEscape: true,
    excludedRootEntries: [],
    sortOrder: 0,
    hint: null,
  };
}

test('manual scan imports unknown Packages and ignores known Installation bytes', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-discovery-'));
  const targetRoot = path.join(temporaryRoot, 'target');
  const candidate = path.join(targetRoot, 'runtime-skill');
  const database = openFoundryDatabase(':memory:');
  try {
    await mkdir(candidate, { recursive: true });
    await writeFile(path.join(candidate, 'SKILL.md'), '# Initial\n');
    const definition = await createDefinition(targetRoot);
    const metadataRepository = new SkillMetadataRepository(database);
    const installationRepository = new SkillInstallationRepository(database, {
      createId: () => installationId,
    });
    const targetRepository = new SkillTargetRepository(database, {
      createId: () => targetId,
      now: () => 100,
    });
    const discovery = new SkillDiscoveryCoordinator({
      userHomeDirectory: temporaryRoot,
      targetRepository,
      installationRepository,
      storeCoordinator: new SkillStoreCoordinator(metadataRepository, {
        createId: () => packageId,
        now: () => 100,
      }),
      resolveTargets: () => Promise.resolve([definition]),
      now: () => 100,
    });

    const imported = await discovery.scan();
    const initialFingerprint = metadataRepository.getActivePackage(packageId).fingerprint;
    assert.equal(imported.packagesImported, 1);
    assert.equal(imported.installationsAdopted, 1);
    assert.equal(
      installationRepository.getActiveInstallation(installationId).distributedFingerprint,
      initialFingerprint,
    );

    await writeFile(path.join(candidate, 'SKILL.md'), '# Externally changed\n');
    const repeated = await discovery.scan();
    assert.equal(repeated.packagesImported, 0);
    assert.equal(repeated.installationsAdopted, 0);
    assert.equal(metadataRepository.getActivePackage(packageId).fingerprint, initialFingerprint);
    assert.equal(metadataRepository.listActivePackages().length, 1);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('manual scan imports an allowed external root link as entity content', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-discovery-link-'));
  const targetRoot = path.join(temporaryRoot, 'target');
  const externalSkill = path.join(temporaryRoot, 'external-skill');
  const database = openFoundryDatabase(':memory:');
  try {
    await Promise.all([mkdir(targetRoot), mkdir(externalSkill)]);
    await writeFile(path.join(externalSkill, 'SKILL.md'), '# Linked\n');
    await symlink(externalSkill, path.join(targetRoot, 'linked-skill'));
    const definition = await createDefinition(targetRoot);
    const metadataRepository = new SkillMetadataRepository(database);
    const installationRepository = new SkillInstallationRepository(database, {
      createId: () => installationId,
    });
    const targetRepository = new SkillTargetRepository(database, {
      createId: () => targetId,
      now: () => 100,
    });
    const storeCoordinator = new SkillStoreCoordinator(metadataRepository, {
      createId: () => packageId,
      now: () => 100,
    });
    const discovery = new SkillDiscoveryCoordinator({
      userHomeDirectory: temporaryRoot,
      targetRepository,
      installationRepository,
      storeCoordinator,
      resolveTargets: () => Promise.resolve([definition]),
      now: () => 100,
    });

    const result = await discovery.scan();
    assert.equal(result.packagesImported, 1);
    assert.equal(result.installationsAdopted, 1);
    const verified = await storeCoordinator.getVerifiedPackageContent(packageId);
    assert.equal(
      verified.inspected.entries.some((entry) => entry.relativePath === 'SKILL.md'),
      true,
    );
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
