import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import type { SkillClawHubProvider } from './skill-clawhub-provider';
import type { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillOperationQueue } from './skill-operation-queue';
import { SkillSourceRepository } from './skill-source-repository';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillUpdateCoordinator } from './skill-update-coordinator';

const packageId = '00000000-0000-4000-8000-000000001001';
const sourceId = '00000000-0000-4000-8000-000000001002';
const oldRevision = '1'.repeat(40);
const newRevision = '2'.repeat(40);

test('returns an ephemeral Update Candidate and atomically applies current content', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-update-'));
  const oldSource = path.join(temporaryRoot, 'old');
  const newSource = path.join(temporaryRoot, 'new');
  const database = openFoundryDatabase(':memory:');
  try {
    await Promise.all([mkdir(oldSource), mkdir(newSource)]);
    await writeFile(path.join(oldSource, 'SKILL.md'), '---\nname: remote-skill\n---\n# Old\n');
    await writeFile(path.join(newSource, 'SKILL.md'), '---\nname: remote-skill\n---\n# New\n');
    const metadataRepository = new SkillMetadataRepository(database);
    const storeCoordinator = new SkillStoreCoordinator(metadataRepository, {
      createId: () => packageId,
      now: () => 100,
    });
    const initial = await storeCoordinator.importPackage(oldSource);
    const sourceRepository = new SkillSourceRepository(database);
    sourceRepository.attachOrRefresh({
      id: sourceId,
      packageId,
      provider: 'git',
      trackingMode: 'tracked',
      sourceNativeId: 'https://github.com/example/skills.git',
      directoryProvider: null,
      catalogLocator: null,
      sourceUrl: 'https://github.com/example/skills.git',
      skillPath: 'remote-skill',
      requestedRef: 'main',
      resolvedRevision: oldRevision,
      artifactDigest: null,
      observedContentFingerprint: initial.package.fingerprint,
      canonicalWebUrl: 'https://github.com/example/skills/tree/main/remote-skill',
      fetchedAt: 100,
    });
    let isReleased = false;
    const git = {
      resolveSourceRevision: () => Promise.resolve({
        resolvedRevision: newRevision,
        artifactDigest: null,
        canonicalWebUrl: 'https://github.com/example/skills/commit/2222222',
      }),
      materializeSourceRevision: () => Promise.resolve({
        contentRoot: newSource,
        resolvedRevision: newRevision,
        artifactDigest: null,
        canonicalWebUrl: 'https://github.com/example/skills/commit/2222222',
        release: () => {
          isReleased = true;
          return Promise.resolve();
        },
      }),
    } as unknown as SkillGitSourceCoordinator;
    const coordinator = new SkillUpdateCoordinator({
      metadataRepository,
      sourceRepository,
      storeCoordinator,
      gitSourceCoordinator: git,
      clawHubProvider: {} as SkillClawHubProvider,
      operationQueue: new SkillOperationQueue(),
      now: () => 200,
    });

    const checked = await coordinator.checkSource(sourceId);
    if (checked.status !== 'update-available') {
      assert.fail('Expected an Update Candidate.');
    }
    assert.equal(
      database.prepare<[string], number>(`
        SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?
      `).pluck().get('skill_update_candidates'),
      0,
    );
    assert.equal(sourceRepository.getSource(sourceId).resolvedRevision, oldRevision);

    const applied = await coordinator.apply(checked.candidate);
    assert.equal(applied.contentChanged, true);
    assert.equal(applied.source.resolvedRevision, newRevision);
    assert.notEqual(applied.skillPackage.fingerprint, initial.package.fingerprint);
    const verified = await storeCoordinator.getVerifiedPackageContent(packageId);
    assert.equal(verified.package.fingerprint, applied.skillPackage.fingerprint);
    assert.equal(isReleased, true);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('reports fixed Sources without resolving remote state', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-fixed-source-'));
  const sourceRoot = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');
  try {
    await mkdir(sourceRoot);
    await writeFile(path.join(sourceRoot, 'SKILL.md'), '# Fixed\n');
    const metadataRepository = new SkillMetadataRepository(database);
    const storeCoordinator = new SkillStoreCoordinator(metadataRepository, {
      createId: () => packageId,
    });
    const imported = await storeCoordinator.importPackage(sourceRoot);
    const sourceRepository = new SkillSourceRepository(database);
    sourceRepository.attachOrRefresh({
      id: sourceId,
      packageId,
      provider: 'git',
      trackingMode: 'fixed',
      sourceNativeId: 'https://github.com/example/skills.git',
      directoryProvider: null,
      catalogLocator: null,
      sourceUrl: 'https://github.com/example/skills.git',
      skillPath: 'fixed',
      requestedRef: oldRevision,
      resolvedRevision: oldRevision,
      artifactDigest: null,
      observedContentFingerprint: imported.package.fingerprint,
      canonicalWebUrl: 'https://github.com/example/skills/commit/1111111',
      fetchedAt: 100,
    });
    const coordinator = new SkillUpdateCoordinator({
      metadataRepository,
      sourceRepository,
      storeCoordinator,
      gitSourceCoordinator: {} as SkillGitSourceCoordinator,
      clawHubProvider: {} as SkillClawHubProvider,
      operationQueue: new SkillOperationQueue(),
    });
    const result = await coordinator.checkSource(sourceId);
    assert.equal(result.status, 'fixed');
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
