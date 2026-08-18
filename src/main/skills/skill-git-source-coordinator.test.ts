import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { lstat, mkdtemp, readFile, readlink, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import type { SkillApiErrorCode } from '../../shared/skill-contract';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillOperationError } from './skill-error';
import type {
  GitCommandRequest,
  GitCommandResult,
  GitCommandRunner,
} from './skill-git-source-coordinator';
import { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillRemoteAcquisitionCoordinator } from './skill-remote-acquisition';
import { SkillSourceRepository } from './skill-source-repository';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillStorePaths } from './skill-store-paths';

const operationId = '00000000-0000-4000-8000-000000000901';
const sessionId = '00000000-0000-4000-8000-000000000902';
const firstCandidateId = '00000000-0000-4000-8000-000000000903';
const secondCandidateId = '00000000-0000-4000-8000-000000000904';
const sourceId = '00000000-0000-4000-8000-000000000905';
const commit = '1'.repeat(40);
const changedCommit = '2'.repeat(40);
const treeObject = '3'.repeat(40);
const manifestObject = '4'.repeat(40);
const guideObject = '5'.repeat(40);
const linkObject = '6'.repeat(40);

interface FakeGitOptions {
  packagePath?: string | null;
  linkTarget?: string | null;
  resolveCommits?: string[];
  remoteRefs?: string[];
}

function createFakeGit(options: FakeGitOptions = {}): GitCommandRunner {
  const packagePath = options.packagePath === undefined ? 'skills/example' : options.packagePath;
  const manifest = Buffer.from('---\nname: remote-example\n---\n# Remote Example\n');
  const guide = Buffer.from('Guide\n');
  const link = options.linkTarget === undefined ? null : Buffer.from(options.linkTarget ?? '');
  const prefix = packagePath ? `${packagePath}/` : '';
  const treeRecords = [
    ...(packagePath ? [`040000 tree ${treeObject} -\t${packagePath}`] : []),
    `100644 blob ${manifestObject} ${manifest.length}\t${prefix}SKILL.md`,
    `100644 blob ${guideObject} ${guide.length}\t${prefix}guide.md`,
    ...(link ? [`120000 blob ${linkObject} ${link.length}\t${prefix}guide-link`] : []),
  ];
  const commits = [...(options.resolveCommits ?? [commit])];
  let lastResolvedCommit = commits[0] ?? commit;
  return async (request: GitCommandRequest): Promise<GitCommandResult> => {
    await Promise.resolve();
    const { args } = request;
    if (args[0] === 'ls-remote' && args.includes('--heads')) {
      const refs = options.remoteRefs ?? ['main'];
      return {
        stdout: Buffer.from(refs.map((ref) => `${commit}\trefs/heads/${ref}\n`).join('')),
      };
    }
    if (args[0] === 'ls-remote') {
      lastResolvedCommit = commits.shift() ?? lastResolvedCommit;
      const requestedRef = args.find((argument) => argument.startsWith('refs/heads/'));
      return {
        stdout: Buffer.from(`${lastResolvedCommit}\t${requestedRef ?? 'HEAD'}\n`),
      };
    }
    if (args.includes('rev-parse')) {
      return { stdout: Buffer.from(`${commit}\n`) };
    }
    if (args.includes('ls-tree')) {
      return { stdout: Buffer.from(`${treeRecords.join('\0')}\0`) };
    }
    if (args.includes('cat-file')) {
      const objectId = args.at(-1);
      const contents = new Map([
        [manifestObject, manifest],
        [guideObject, guide],
        [linkObject, link ?? Buffer.alloc(0)],
      ]);
      const content = contents.get(objectId ?? '');
      if (!content) {
        throw new Error('Unexpected fake Git object.');
      }
      return { stdout: content };
    }
    return { stdout: Buffer.alloc(0) };
  };
}

function idSequence(values: string[]): () => string {
  const ids = [...values];
  return () => {
    const id = ids.shift();
    assert.ok(id, 'The test ID sequence was exhausted.');
    return id;
  };
}

async function createFixture(runGit: GitCommandRunner) {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-git-source-'));
  const database = openFoundryDatabase(':memory:');
  const paths = new SkillStorePaths(userHome);
  const metadataRepository = new SkillMetadataRepository(database);
  const sourceRepository = new SkillSourceRepository(database);
  const storeCoordinator = new SkillStoreCoordinator(paths, metadataRepository);
  await storeCoordinator.initialize();
  const acquisition = new SkillRemoteAcquisitionCoordinator(paths, {
    createId: () => operationId,
    now: () => 10,
  });
  await acquisition.initialize();
  const coordinator = new SkillGitSourceCoordinator({
    acquisition,
    storeCoordinator,
    sourceRepository,
    createId: idSequence([sessionId, firstCandidateId, secondCandidateId, sourceId]),
    now: () => 20,
    runGit,
  });
  return {
    userHome,
    database,
    paths,
    metadataRepository,
    sourceRepository,
    coordinator,
  };
}

async function disposeFixture(fixture: Awaited<ReturnType<typeof createFixture>>): Promise<void> {
  await fixture.coordinator.dispose();
  fixture.database.close();
  await rm(fixture.userHome, { recursive: true, force: true });
}

async function assertSkillError(
  operation: () => Promise<unknown>,
  code: SkillApiErrorCode,
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => (
    error instanceof SkillOperationError && error.code === code
  ));
}

test('resolves a Git ref, materializes one package, and attaches exact provenance', async () => {
  const fixture = await createFixture(createFakeGit({ linkTarget: 'guide.md' }));
  try {
    const resolution = await fixture.coordinator.resolve(7, {
      sourceUrl: 'https://github.com/example/skills',
      requestedRef: 'main',
    });
    assert.equal(resolution.sourceUrl, 'https://github.com/example/skills.git');
    assert.equal(resolution.resolvedRevision, commit);
    assert.deepEqual(resolution.packages.map((candidate) => candidate.packagePath), ['skills/example']);

    const added = await fixture.coordinator.addToStore(7, resolution.packages[0].id);
    assert.equal(added.reusedPackage, false);
    assert.equal(added.source.provider, 'git');
    assert.equal(added.source.trackingMode, 'tracked');
    assert.equal(added.source.resolvedRevision, commit);
    assert.equal(added.source.skillPath, 'skills/example');
    assert.equal(
      added.source.canonicalWebUrl,
      `https://github.com/example/skills/tree/${commit}/skills/example`,
    );
    const packageRoot = path.join(fixture.paths.packages, added.skillPackage.id);
    assert.equal(await readFile(path.join(packageRoot, 'guide.md'), 'utf8'), 'Guide\n');
    const linkStats = await lstat(path.join(packageRoot, 'guide-link'));
    assert.equal(linkStats.isSymbolicLink(), true);
    assert.equal(await readlink(path.join(packageRoot, 'guide-link')), 'guide.md');
    assert.deepEqual(fixture.sourceRepository.listSources(added.skillPackage.id), [added.source]);
    assert.deepEqual(await readdir(fixture.paths.remoteOperations), []);
  } finally {
    await disposeFixture(fixture);
  }
});

test('resolves slash-containing refs in GitHub tree URLs and narrows the package path', async () => {
  const fixture = await createFixture(createFakeGit({ remoteRefs: ['main', 'feature/branch'] }));
  try {
    const resolution = await fixture.coordinator.resolve(7, {
      sourceUrl: 'https://github.com/example/skills/tree/feature/branch/skills/example',
      requestedRef: null,
    });
    assert.equal(resolution.requestedRef, 'feature/branch');
    assert.deepEqual(resolution.packages.map((candidate) => candidate.packagePath), ['skills/example']);
  } finally {
    await disposeFixture(fixture);
  }
});

test('rejects a moving ref that changed after resolution and removes staging', async () => {
  const fixture = await createFixture(createFakeGit({
    resolveCommits: [commit, changedCommit],
  }));
  try {
    const resolution = await fixture.coordinator.resolve(7, {
      sourceUrl: 'https://github.com/example/skills.git',
      requestedRef: 'main',
    });
    await assertSkillError(
      () => fixture.coordinator.addToStore(7, resolution.packages[0].id),
      'stale-result',
    );
    assert.deepEqual(fixture.metadataRepository.listActivePackages(), []);
    assert.deepEqual(await readdir(fixture.paths.remoteOperations), []);
  } finally {
    await disposeFixture(fixture);
  }
});

test('rejects Git symlinks that would escape the selected package root', async () => {
  const fixture = await createFixture(createFakeGit({ linkTarget: '../../outside' }));
  try {
    const resolution = await fixture.coordinator.resolve(7, {
      sourceUrl: 'https://github.com/example/skills.git',
      requestedRef: commit,
    });
    await assertSkillError(
      () => fixture.coordinator.addToStore(7, resolution.packages[0].id),
      'content-unavailable',
    );
    assert.deepEqual(fixture.metadataRepository.listActivePackages(), []);
  } finally {
    await disposeFixture(fixture);
  }
});

test('keeps a commit-pinned root package as a Fixed Source', async () => {
  const fixture = await createFixture(createFakeGit({ packagePath: null }));
  try {
    const resolution = await fixture.coordinator.resolve(7, {
      sourceUrl: 'git@github.com:example/skills.git',
      requestedRef: commit,
    });
    assert.equal(resolution.packages[0]?.packagePath, '.');
    const added = await fixture.coordinator.addToStore(7, resolution.packages[0].id);
    assert.equal(added.source.trackingMode, 'fixed');
    assert.equal(added.source.skillPath, null);
    assert.equal(
      added.source.canonicalWebUrl,
      `https://github.com/example/skills/tree/${commit}`,
    );
  } finally {
    await disposeFixture(fixture);
  }
});
