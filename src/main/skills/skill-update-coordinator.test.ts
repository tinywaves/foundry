import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import type { SkillClawHubProvider } from './skill-clawhub-provider';
import { SkillOperationError } from './skill-error';
import type { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillSourceRepository } from './skill-source-repository';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillStorePaths } from './skill-store-paths';
import { SkillUpdateCoordinator } from './skill-update-coordinator';

const sourceId = '00000000-0000-4000-8000-000000000b01';
const candidateId = '00000000-0000-4000-8000-000000000b02';
const secondCandidateId = '00000000-0000-4000-8000-000000000b03';
const oldRevision = '1'.repeat(40);
const newRevision = '2'.repeat(40);
const movedRevision = '3'.repeat(40);

test('checks tracked and fixed Sources without downloading content', async () => {
  const fixture = await createFixture();
  let resolveCount = 0;
  const gate = Promise.withResolvers<undefined>();
  const coordinator = createCoordinator(fixture, {
    resolveSourceRevision: async () => {
      resolveCount += 1;
      await gate.promise;
      return {
        resolvedRevision: newRevision,
        artifactDigest: null,
        canonicalWebUrl: 'https://github.com/example/skills/tree/2222/example',
      };
    },
  }, [candidateId]);
  try {
    const firstCheck = coordinator.checkSource(sourceId);
    const secondCheck = coordinator.checkSource(sourceId);
    assert.equal(firstCheck, secondCheck);
    gate.resolve(undefined);
    const checked = await firstCheck;
    assert.equal(resolveCount, 1);
    if (checked.status !== 'update-available') {
      assert.fail('Expected an Update Candidate.');
    }
    assert.equal(checked.candidate.resolvedRevision, newRevision);

    const fixed = fixture.sourceRepository.attachOrRefresh({
      ...sourceInput(fixture.packageId, fixture.fingerprint),
      id: '00000000-0000-4000-8000-000000000b04',
      requestedRef: oldRevision,
      trackingMode: 'fixed',
    });
    const fixedResult = await coordinator.checkSource(fixed.id);
    assert.equal(fixedResult.status, 'fixed');
    assert.equal(resolveCount, 1);
  } finally {
    await disposeFixture(fixture);
  }
});

test('records unavailable metadata checks without changing Store content', async () => {
  const fixture = await createFixture();
  const coordinator = createCoordinator(fixture, {
    resolveSourceRevision: () => Promise.reject(
      new SkillOperationError('network-unavailable', 'The Git Source is unavailable.'),
    ),
  }, [candidateId]);
  try {
    const before = fixture.metadataRepository.getActivePackage(fixture.packageId);
    const result = await coordinator.checkSource(sourceId);
    const after = fixture.metadataRepository.getActivePackage(fixture.packageId);
    assert.equal(result.status, 'unavailable');
    assert.deepEqual(after.storeObservation, before.storeObservation);
    assert.deepEqual(fixture.sourceRepository.getSource(sourceId).check, {
      status: 'unavailable',
      checkedAt: 100,
    });
  } finally {
    await disposeFixture(fixture);
  }
});

test('applies the checked immutable revision and creates a remote-update revision', async () => {
  const fixture = await createFixture();
  const updatedRoot = await createPackage(fixture.userHome, 'updated', 'Updated guidance\n');
  let releaseCount = 0;
  const coordinator = createCoordinator(fixture, {
    resolveSourceRevision: () => Promise.resolve({
      resolvedRevision: newRevision,
      artifactDigest: null,
      canonicalWebUrl: 'https://github.com/example/skills/tree/2222/example',
    }),
    materializeSourceRevision: () => Promise.resolve({
      contentRoot: updatedRoot,
      resolvedRevision: newRevision,
      artifactDigest: null,
      canonicalWebUrl: 'https://github.com/example/skills/tree/2222/example',
      release: () => {
        releaseCount += 1;
        return Promise.resolve();
      },
    }),
  }, [candidateId]);
  try {
    const checked = await coordinator.checkSource(sourceId);
    if (checked.status !== 'update-available') {
      assert.fail('Expected an Update Candidate.');
    }
    const applied = await coordinator.apply(checked.candidate.id);
    assert.equal(applied.contentChanged, true);
    assert.equal(applied.source.resolvedRevision, newRevision);
    assert.equal(applied.source.check.status, 'current');
    assert.equal(releaseCount, 1);
    const revisions = fixture.metadataRepository.listRevisions(fixture.packageId);
    assert.equal(revisions[0]?.reason, 'remote-update');
    assert.equal(revisions[0]?.id, applied.revisionId);
  } finally {
    await disposeFixture(fixture);
  }
});

test('refreshes provenance for equal content without creating a redundant revision', async () => {
  const fixture = await createFixture();
  const currentRoot = await createPackage(fixture.userHome, 'same', 'Initial guidance\n');
  const coordinator = createCoordinator(fixture, {
    resolveSourceRevision: () => Promise.resolve({
      resolvedRevision: newRevision,
      artifactDigest: null,
      canonicalWebUrl: 'https://github.com/example/skills/tree/2222/example',
    }),
    materializeSourceRevision: () => Promise.resolve({
      contentRoot: currentRoot,
      resolvedRevision: newRevision,
      artifactDigest: null,
      canonicalWebUrl: 'https://github.com/example/skills/tree/2222/example',
      release: () => Promise.resolve(),
    }),
  }, [candidateId]);
  try {
    const revisionCount = fixture.metadataRepository.listRevisions(fixture.packageId).length;
    const checked = await coordinator.checkSource(sourceId);
    if (checked.status !== 'update-available') {
      assert.fail('Expected an Update Candidate.');
    }
    const applied = await coordinator.apply(checked.candidate.id);
    assert.equal(applied.contentChanged, false);
    assert.equal(
      fixture.metadataRepository.listRevisions(fixture.packageId).length,
      revisionCount,
    );
    assert.equal(applied.source.resolvedRevision, newRevision);
  } finally {
    await disposeFixture(fixture);
  }
});

test('rejects a Candidate when the moving Source advances before apply', async () => {
  const fixture = await createFixture();
  const revisions = [newRevision, movedRevision];
  let materializeCount = 0;
  const coordinator = createCoordinator(fixture, {
    resolveSourceRevision: () => Promise.resolve({
      resolvedRevision: revisions.shift() ?? movedRevision,
      artifactDigest: null,
      canonicalWebUrl: 'https://github.com/example/skills',
    }),
    materializeSourceRevision: () => {
      materializeCount += 1;
      throw new Error('Materialization should not start.');
    },
  }, [secondCandidateId]);
  try {
    const checked = await coordinator.checkSource(sourceId);
    if (checked.status !== 'update-available') {
      assert.fail('Expected an Update Candidate.');
    }
    await assert.rejects(
      () => coordinator.apply(checked.candidate.id),
      (error: unknown) => error instanceof SkillOperationError && error.code === 'stale-result',
    );
    assert.equal(materializeCount, 0);
    assert.equal(
      fixture.sourceRepository.getSource(sourceId).resolvedRevision,
      oldRevision,
    );
  } finally {
    await disposeFixture(fixture);
  }
});

test('resumes Source metadata after Store replacement committed before a storage failure', async () => {
  const fixture = await createFixture();
  const updatedRoot = await createPackage(fixture.userHome, 'resumable', 'Resumable update\n');
  const git = {
    resolveSourceRevision: () => Promise.resolve({
      resolvedRevision: newRevision,
      artifactDigest: null,
      canonicalWebUrl: 'https://github.com/example/skills/tree/2222/example',
    }),
    materializeSourceRevision: () => Promise.resolve({
      contentRoot: updatedRoot,
      resolvedRevision: newRevision,
      artifactDigest: null,
      canonicalWebUrl: 'https://github.com/example/skills/tree/2222/example',
      release: () => Promise.resolve(),
    }),
  };
  const checkingCoordinator = createCoordinator(fixture, git, [candidateId]);
  try {
    const checked = await checkingCoordinator.checkSource(sourceId);
    if (checked.status !== 'update-available') {
      assert.fail('Expected an Update Candidate.');
    }
    let shouldFail = true;
    const recoveringRepository = {
      getActiveCandidate: fixture.sourceRepository.getActiveCandidate.bind(
        fixture.sourceRepository,
      ),
      getSource: fixture.sourceRepository.getSource.bind(fixture.sourceRepository),
      markCandidateApplied: (
        input: Parameters<SkillSourceRepository['markCandidateApplied']>[0],
      ) => {
        if (shouldFail) {
          throw new SkillOperationError(
            'storage-unavailable',
            'Skill storage is unavailable.',
          );
        }
        return fixture.sourceRepository.markCandidateApplied(input);
      },
    } as unknown as SkillSourceRepository;
    const applyingCoordinator = createCoordinator(fixture, git, [], recoveringRepository);

    await assert.rejects(
      () => applyingCoordinator.apply(checked.candidate.id),
      (error: unknown) => (
        error instanceof SkillOperationError && error.code === 'storage-unavailable'
      ),
    );
    assert.equal(fixture.sourceRepository.getSource(sourceId).resolvedRevision, oldRevision);
    assert.equal(
      fixture.sourceRepository.getActiveCandidate(checked.candidate.id).resolvedRevision,
      newRevision,
    );
    assert.equal(fixture.metadataRepository.listRevisions(fixture.packageId).length, 2);

    shouldFail = false;
    const resumed = await applyingCoordinator.apply(checked.candidate.id);
    assert.equal(resumed.source.resolvedRevision, newRevision);
    assert.equal(resumed.contentChanged, false);
    assert.equal(fixture.metadataRepository.listRevisions(fixture.packageId).length, 2);
  } finally {
    await disposeFixture(fixture);
  }
});

interface FakeGitSource {
  resolveSourceRevision: SkillGitSourceCoordinator['resolveSourceRevision'];
  materializeSourceRevision?: SkillGitSourceCoordinator['materializeSourceRevision'];
}

function createCoordinator(
  fixture: Awaited<ReturnType<typeof createFixture>>,
  git: FakeGitSource,
  ids: string[],
  sourceRepository: SkillSourceRepository = fixture.sourceRepository,
): SkillUpdateCoordinator {
  return new SkillUpdateCoordinator({
    metadataRepository: fixture.metadataRepository,
    sourceRepository,
    storeCoordinator: fixture.storeCoordinator,
    gitSourceCoordinator: git as SkillGitSourceCoordinator,
    clawHubProvider: {} as SkillClawHubProvider,
    createId: idSequence(ids),
    now: () => 100,
  });
}

async function createFixture() {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-update-'));
  const database = openFoundryDatabase(':memory:');
  const paths = new SkillStorePaths(userHome);
  const metadataRepository = new SkillMetadataRepository(database);
  const sourceRepository = new SkillSourceRepository(database);
  const storeCoordinator = new SkillStoreCoordinator(paths, metadataRepository);
  await storeCoordinator.initialize();
  const initialRoot = await createPackage(userHome, 'initial', 'Initial guidance\n');
  const imported = await storeCoordinator.importPackage(initialRoot);
  if (imported.package.storeObservation.status !== 'available') {
    assert.fail('Fixture Store package is unavailable.');
  }
  const fingerprint = imported.package.storeObservation.fingerprint;
  const source = sourceRepository.attachOrRefresh(sourceInput(imported.package.id, fingerprint));
  return {
    userHome,
    database,
    metadataRepository,
    sourceRepository,
    storeCoordinator,
    packageId: imported.package.id,
    fingerprint,
    source,
  };
}

function sourceInput(
  packageId: string,
  fingerprint: string,
): Parameters<SkillSourceRepository['attachOrRefresh']>[0] {
  return {
    id: sourceId,
    packageId,
    provider: 'git',
    trackingMode: 'tracked',
    sourceNativeId: 'https://github.com/example/skills.git',
    directoryProvider: null,
    catalogLocator: null,
    sourceUrl: 'https://github.com/example/skills.git',
    skillPath: 'example',
    requestedRef: 'main',
    resolvedRevision: oldRevision,
    artifactDigest: null,
    observedContentFingerprint: fingerprint,
    canonicalWebUrl: 'https://github.com/example/skills/tree/1111/example',
    fetchedAt: 50,
    checkedAt: null,
  };
}

async function createPackage(
  parent: string,
  name: string,
  contents: string,
): Promise<string> {
  const packageRoot = path.join(parent, name);
  await mkdir(packageRoot);
  await writeFile(
    path.join(packageRoot, 'SKILL.md'),
    `---\nname: example\n---\n${contents}`,
  );
  return packageRoot;
}

function idSequence(values: string[]): () => string {
  const ids = [...values];
  return () => {
    const id = ids.shift();
    assert.ok(id, 'The test ID sequence was exhausted.');
    return id;
  };
}

async function disposeFixture(
  fixture: Awaited<ReturnType<typeof createFixture>>,
): Promise<void> {
  fixture.database.close();
  await rm(fixture.userHome, { recursive: true, force: true });
}
