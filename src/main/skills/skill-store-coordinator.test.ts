import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { fingerprintSkillPackage } from './skill-package-fingerprint';
import { SkillOperationError } from './skill-error';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillStorePaths } from './skill-store-paths';

const packageId = '00000000-0000-4000-8000-000000000201';
const revisionId = '00000000-0000-4000-8000-000000000202';
const operationId = '00000000-0000-4000-8000-000000000203';

test('imports a recognized package into the Store with one verified initial revision', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-import-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(path.join(source, 'references'), { recursive: true });
    await writeFile(
      path.join(source, 'SKILL.md'),
      '---\nname: imported-skill\ndescription: Example\n---\n\n# Imported\n',
    );
    await writeFile(path.join(source, 'references', 'guide.md'), 'Preserve me.\n');
    await symlink('references/guide.md', path.join(source, 'guide-link'));

    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    const coordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => 500,
    });
    await coordinator.initialize();

    const imported = await coordinator.importPackage(source);
    const expectedFingerprint = await fingerprintSkillPackage(source);
    const storedPackage = path.join(paths.packages, packageId);
    const storedRevision = path.join(paths.revisions, packageId, revisionId);

    assert.deepEqual(imported, {
      package: {
        id: packageId,
        distributionName: 'imported-skill',
        storeObservation: {
          status: 'available',
          fingerprint: expectedFingerprint,
          observedAt: 500,
        },
        createdAt: 500,
        updatedAt: 500,
      },
      revision: {
        id: revisionId,
        packageId,
        sequenceNumber: 1,
        fingerprint: expectedFingerprint,
        reason: 'import',
        createdAt: 500,
      },
      reused: false,
    });
    assert.equal(await readFile(path.join(storedPackage, 'references', 'guide.md'), 'utf8'), 'Preserve me.\n');
    assert.equal(await readlink(path.join(storedPackage, 'guide-link')), 'references/guide.md');
    assert.equal(await fingerprintSkillPackage(storedPackage), expectedFingerprint);
    assert.equal(await fingerprintSkillPackage(storedRevision), expectedFingerprint);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('reuses one active Skill Package for identical imported content', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-import-deduplicate-'));
  const userHome = path.join(temporaryRoot, 'home');
  const firstSource = path.join(temporaryRoot, 'first-source');
  const secondSource = path.join(temporaryRoot, 'second-source');
  const database = openFoundryDatabase(':memory:');

  try {
    await Promise.all([mkdir(firstSource), mkdir(secondSource)]);
    await Promise.all([
      writeFile(path.join(firstSource, 'SKILL.md'), '# Same content\n'),
      writeFile(path.join(secondSource, 'SKILL.md'), '# Same content\n'),
    ]);

    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    const coordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => 600,
    });
    await coordinator.initialize();

    const firstImport = await coordinator.importPackage(firstSource);
    const secondImport = await coordinator.importPackage(secondSource);

    assert.deepEqual(secondImport, {
      package: firstImport.package,
      revision: null,
      reused: true,
    });
    assert.deepEqual(await readdir(paths.packages), [packageId]);
    assert.deepEqual(await readdir(path.join(paths.revisions, packageId)), [revisionId]);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('serializes concurrent imports of identical content into one Skill ID', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-import-concurrent-'));
  const userHome = path.join(temporaryRoot, 'home');
  const firstSource = path.join(temporaryRoot, 'first-source');
  const secondSource = path.join(temporaryRoot, 'second-source');
  const database = openFoundryDatabase(':memory:');

  try {
    await Promise.all([mkdir(firstSource), mkdir(secondSource)]);
    await Promise.all([
      writeFile(path.join(firstSource, 'SKILL.md'), '# Concurrent content\n'),
      writeFile(path.join(secondSource, 'SKILL.md'), '# Concurrent content\n'),
    ]);

    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [
      packageId,
      revisionId,
      operationId,
      '00000000-0000-4000-8000-000000000204',
      '00000000-0000-4000-8000-000000000205',
      '00000000-0000-4000-8000-000000000206',
    ];
    const coordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => 700,
    });
    await coordinator.initialize();

    const results = await Promise.all([
      coordinator.importPackage(firstSource),
      coordinator.importPackage(secondSource),
    ]);

    assert.deepEqual(results.map((result) => result.package.id), [packageId, packageId]);
    assert.deepEqual(results.map((result) => result.reused), [false, true]);
    assert.deepEqual(await readdir(paths.packages), [packageId]);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('compensates Store content when the metadata transaction fails', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-import-storage-failure-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Fails at commit\n');
    database.exec(`
      CREATE TRIGGER reject_skill_import_revision
      BEFORE INSERT ON skill_revisions
      BEGIN
        SELECT RAISE(ABORT, 'injected import failure');
      END;
    `);

    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    const coordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => 800,
    });
    await coordinator.initialize();

    await assert.rejects(
      () => coordinator.importPackage(source),
      (error: unknown) => error instanceof SkillOperationError
        && error.code === 'storage-unavailable',
    );
    assert.deepEqual(await readdir(paths.packages), []);
    assert.deepEqual(await readdir(paths.revisions), []);
    assert.deepEqual(await readdir(paths.operations), []);
    assert.equal(repository.findActivePackageByFingerprint(await fingerprintSkillPackage(source)), null);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('removes partial staging when a package copy fails', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-import-copy-failure-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Fails while copying\n');

    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    const coordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => 900,
      copyPackage: async (_copySource, destination) => {
        await mkdir(destination);
        await writeFile(path.join(destination, 'partial'), 'partial');
        throw Object.assign(new Error('injected copy failure'), { code: 'EIO' });
      },
    });
    await coordinator.initialize();

    await assert.rejects(
      () => coordinator.importPackage(source),
      (error: unknown) => error instanceof SkillOperationError
        && error.code === 'filesystem-unavailable',
    );
    assert.deepEqual(await readdir(paths.packages), []);
    assert.deepEqual(await readdir(paths.revisions), []);
    assert.deepEqual(await readdir(paths.operations), []);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('never compensates a pre-existing Store path that the operation did not create', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-import-path-collision-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# New content\n');

    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    const coordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => 1000,
    });
    await coordinator.initialize();
    const preExistingPackage = path.join(paths.packages, packageId);
    await mkdir(preExistingPackage);
    await writeFile(path.join(preExistingPackage, 'SKILL.md'), '# User-authored content\n');

    await assert.rejects(() => coordinator.importPackage(source));

    assert.equal(
      await readFile(path.join(preExistingPackage, 'SKILL.md'), 'utf8'),
      '# User-authored content\n',
    );
    assert.deepEqual(await readdir(paths.operations), []);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('leaves an interruption marker when operation-owned staging cannot be removed', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-import-marker-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Interrupted copy\n');

    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    const coordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => 1100,
      copyPackage: async (_copySource, destination) => {
        await mkdir(destination);
        throw Object.assign(new Error('injected copy failure'), { code: 'EIO' });
      },
      removePath: () => Promise.reject(
        Object.assign(new Error('injected cleanup failure'), { code: 'EBUSY' }),
      ),
    });
    await coordinator.initialize();

    await assert.rejects(() => coordinator.importPackage(source));

    assert.deepEqual(await readdir(paths.operations), [operationId]);
    const marker = JSON.parse(await readFile(
      path.join(paths.operations, operationId, 'operation.json'),
      'utf8',
    )) as { phase: string; packageId: string };
    assert.deepEqual(
      { phase: marker.phase, packageId: marker.packageId },
      { phase: 'copying', packageId },
    );
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('removes abandoned private staging during initialization', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-recovery-staging-'));
  const userHome = path.join(temporaryRoot, 'home');
  const database = openFoundryDatabase(':memory:');

  try {
    const paths = new SkillStorePaths(userHome);
    await paths.initialize();
    const abandoned = path.join(paths.operations, operationId);
    await mkdir(abandoned);
    await writeFile(path.join(abandoned, 'partial'), 'partial');

    const coordinator = new SkillStoreCoordinator(
      paths,
      new SkillMetadataRepository(database),
    );
    await coordinator.initialize();

    assert.deepEqual(await readdir(paths.operations), []);
    assert.deepEqual(await readdir(paths.packages), []);
    assert.deepEqual(await readdir(paths.revisions), []);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('rolls back verified import content that has no committed metadata', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-recovery-rollback-'));
  const userHome = path.join(temporaryRoot, 'home');
  const database = openFoundryDatabase(':memory:');

  try {
    const paths = new SkillStorePaths(userHome);
    await paths.initialize();
    const storedPackage = path.join(paths.packages, packageId);
    const storedRevision = path.join(paths.revisions, packageId, revisionId);
    const operationRoot = path.join(paths.operations, operationId);
    await Promise.all([
      mkdir(storedPackage, { recursive: true }),
      mkdir(storedRevision, { recursive: true }),
      mkdir(operationRoot),
    ]);
    await Promise.all([
      writeFile(path.join(storedPackage, 'SKILL.md'), '# Interrupted\n'),
      writeFile(path.join(storedRevision, 'SKILL.md'), '# Interrupted\n'),
    ]);
    const fingerprint = await fingerprintSkillPackage(storedPackage);
    await writeFile(path.join(operationRoot, 'operation.json'), `${JSON.stringify({
      version: 1,
      kind: 'import',
      phase: 'content-ready',
      operationId,
      packageId,
      revisionId,
      fingerprint,
      distributionName: 'interrupted',
      createdAt: 1200,
    })}\n`);

    const coordinator = new SkillStoreCoordinator(
      paths,
      new SkillMetadataRepository(database),
    );
    await coordinator.initialize();

    assert.deepEqual(await readdir(paths.packages), []);
    assert.deepEqual(await readdir(paths.revisions), []);
    assert.deepEqual(await readdir(paths.operations), []);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('completes recovery for committed import metadata without deleting content', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-recovery-commit-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Committed\n');
    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    const interruptedCoordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => 1300,
      removePath: () => Promise.reject(
        Object.assign(new Error('injected cleanup failure'), { code: 'EBUSY' }),
      ),
    });
    await interruptedCoordinator.initialize();
    const imported = await interruptedCoordinator.importPackage(source);
    assert.deepEqual(await readdir(paths.operations), [operationId]);

    const recoveredCoordinator = new SkillStoreCoordinator(paths, repository, {
      now: () => 1300,
    });
    await recoveredCoordinator.initialize();

    assert.deepEqual(await readdir(paths.operations), []);
    assert.equal(
      await fingerprintSkillPackage(path.join(paths.packages, packageId)),
      imported.package.storeObservation.status === 'available'
        ? imported.package.storeObservation.fingerprint
        : '',
    );
    assert.deepEqual(repository.getActivePackage(packageId), imported.package);
    assert.deepEqual(repository.listRevisions(packageId), [imported.revision]);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('reconciles external Store edits without creating a Skill Revision', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-store-reconcile-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Initial\n');
    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    let now = 1400;
    const coordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => now,
    });
    await coordinator.initialize();
    const imported = await coordinator.importPackage(source);
    const storedPackage = path.join(paths.packages, packageId);
    const storedRevision = path.join(paths.revisions, packageId, revisionId);

    now = 1500;
    await writeFile(path.join(storedPackage, 'SKILL.md'), '# Externally edited\n');
    const reconciled = await coordinator.reconcileStorePackages();
    const editedFingerprint = await fingerprintSkillPackage(storedPackage);

    assert.deepEqual(reconciled, [
      {
        ...imported.package,
        storeObservation: {
          status: 'available',
          fingerprint: editedFingerprint,
          observedAt: 1500,
        },
        updatedAt: 1500,
      },
    ]);
    assert.deepEqual(repository.listRevisions(packageId), [imported.revision]);
    assert.equal(
      await readFile(path.join(storedRevision, 'SKILL.md'), 'utf8'),
      '# Initial\n',
    );
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('reconciles missing and unreadable Store working copies without deleting metadata', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-store-unavailable-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Initial\n');
    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    let now = 1600;
    const coordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => now,
    });
    await coordinator.initialize();
    const imported = await coordinator.importPackage(source);
    const storedPackage = path.join(paths.packages, packageId);
    const storedRevision = path.join(paths.revisions, packageId, revisionId);

    now = 1700;
    await rm(storedPackage, { recursive: true });
    assert.deepEqual(await coordinator.reconcileStorePackages(), [
      {
        ...imported.package,
        storeObservation: { status: 'missing', observedAt: 1700 },
        updatedAt: 1700,
      },
    ]);

    now = 1800;
    await symlink(storedRevision, storedPackage);
    assert.deepEqual(await coordinator.reconcileStorePackages(), [
      {
        ...imported.package,
        storeObservation: { status: 'unreadable', observedAt: 1800 },
        updatedAt: 1800,
      },
    ]);
    assert.deepEqual(repository.listRevisions(packageId), [imported.revision]);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('reconciles metadata-owned Store paths during initialization', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-store-startup-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Initial\n');
    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    const importingCoordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => 1900,
    });
    await importingCoordinator.initialize();
    await importingCoordinator.importPackage(source);
    const storedPackage = path.join(paths.packages, packageId);
    await writeFile(path.join(storedPackage, 'SKILL.md'), '# Edited before restart\n');

    const restartedCoordinator = new SkillStoreCoordinator(paths, repository, {
      now: () => 2000,
    });
    await restartedCoordinator.initialize();

    assert.deepEqual(repository.getActivePackage(packageId).storeObservation, {
      status: 'available',
      fingerprint: await fingerprintSkillPackage(storedPackage),
      observedAt: 2000,
    });
    assert.equal(repository.listRevisions(packageId).length, 1);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('creates and reuses immutable revisions at explicit content boundaries', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-revision-boundary-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');
  const promotedRevisionId = '00000000-0000-4000-8000-000000000204';
  const revisionOperationId = '00000000-0000-4000-8000-000000000205';

  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Initial\n');
    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [
      packageId,
      revisionId,
      operationId,
      promotedRevisionId,
      revisionOperationId,
    ];
    let now = 2100;
    const coordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => now,
    });
    await coordinator.initialize();
    await coordinator.importPackage(source);
    const storedPackage = path.join(paths.packages, packageId);

    now = 2200;
    await writeFile(path.join(storedPackage, 'SKILL.md'), '# Promoted content\n');
    const created = await coordinator.snapshotStorePackage(packageId, 'promotion');
    const reused = await coordinator.snapshotStorePackage(packageId, 'distribution');

    assert.deepEqual(created, {
      revision: {
        id: promotedRevisionId,
        packageId,
        sequenceNumber: 2,
        fingerprint: await fingerprintSkillPackage(storedPackage),
        reason: 'promotion',
        createdAt: 2200,
      },
      reused: false,
    });
    assert.deepEqual(reused, { revision: created.revision, reused: true });

    await writeFile(path.join(storedPackage, 'SKILL.md'), '# Later edit\n');
    assert.equal(
      await readFile(
        path.join(paths.revisions, packageId, promotedRevisionId, 'SKILL.md'),
        'utf8',
      ),
      '# Promoted content\n',
    );
    assert.equal(repository.listRevisions(packageId).length, 2);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('recovers a committed revision snapshot after marker cleanup was interrupted', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-revision-recovery-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');
  const promotedRevisionId = '00000000-0000-4000-8000-000000000204';
  const revisionOperationId = '00000000-0000-4000-8000-000000000205';

  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Initial\n');
    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const importIds = [packageId, revisionId, operationId];
    const importingCoordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => importIds.shift()!,
      now: () => 2300,
    });
    await importingCoordinator.initialize();
    await importingCoordinator.importPackage(source);
    await writeFile(
      path.join(paths.packages, packageId, 'SKILL.md'),
      '# Snapshot survives restart\n',
    );

    const revisionIds = [promotedRevisionId, revisionOperationId];
    const interruptedCoordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => revisionIds.shift()!,
      now: () => 2400,
      removePath: () => Promise.reject(
        Object.assign(new Error('injected cleanup failure'), { code: 'EBUSY' }),
      ),
    });
    await interruptedCoordinator.initialize();
    const snapshot = await interruptedCoordinator.snapshotStorePackage(packageId, 'promotion');
    assert.deepEqual(await readdir(paths.operations), [revisionOperationId]);

    const recoveredCoordinator = new SkillStoreCoordinator(paths, repository, {
      now: () => 2500,
    });
    await recoveredCoordinator.initialize();

    assert.deepEqual(await readdir(paths.operations), []);
    assert.equal(
      await fingerprintSkillPackage(
        path.join(paths.revisions, packageId, promotedRevisionId),
      ),
      snapshot.revision.fingerprint,
    );
    assert.equal(repository.listRevisions(packageId).length, 2);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('recovers a committed Store promotion after marker cleanup was interrupted', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-promotion-recovery-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const promotedSource = path.join(temporaryRoot, 'promoted-source');
  const database = openFoundryDatabase(':memory:');
  const promotionRevisionId = '00000000-0000-4000-8000-000000000206';
  const promotionOperationId = '00000000-0000-4000-8000-000000000207';

  try {
    await Promise.all([mkdir(source), mkdir(promotedSource)]);
    await Promise.all([
      writeFile(path.join(source, 'SKILL.md'), '# Initial\n'),
      writeFile(path.join(promotedSource, 'SKILL.md'), '# Promoted\n'),
    ]);
    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const importIds = [packageId, revisionId, operationId];
    const importingCoordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => importIds.shift()!,
      now: () => 2500,
    });
    await importingCoordinator.initialize();
    await importingCoordinator.importPackage(source);

    const promotionIds = [promotionRevisionId, promotionOperationId];
    const interruptedCoordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => promotionIds.shift()!,
      now: () => 2600,
      removePath: (targetPath) => {
        if (targetPath === path.join(paths.operations, promotionOperationId)) {
          return Promise.reject(Object.assign(new Error('injected cleanup failure'), {
            code: 'EBUSY',
          }));
        }
        return rm(targetPath, { recursive: true, force: true });
      },
    });
    await interruptedCoordinator.initialize();
    const promoted = await interruptedCoordinator.promoteStorePackage(
      packageId,
      promotedSource,
    );

    assert.equal(promoted.revision.id, promotionRevisionId);
    assert.equal(promoted.revision.reason, 'promotion');
    assert.deepEqual(await readdir(paths.operations), [promotionOperationId]);
    assert.equal(
      await readFile(path.join(paths.packages, packageId, 'SKILL.md'), 'utf8'),
      '# Promoted\n',
    );

    const recoveredCoordinator = new SkillStoreCoordinator(paths, repository, {
      now: () => 2700,
    });
    await recoveredCoordinator.initialize();

    assert.deepEqual(await readdir(paths.operations), []);
    assert.equal(
      await fingerprintSkillPackage(path.join(paths.packages, packageId)),
      promoted.revision.fingerprint,
    );
    assert.equal(repository.listRevisions(packageId).length, 2);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('imports malformed manifest frontmatter using the source directory name', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-import-manifest-'));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'fallback-name');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '---\nname: [broken\n---\n');
    const paths = new SkillStorePaths(userHome);
    const repository = new SkillMetadataRepository(database);
    const ids = [packageId, revisionId, operationId];
    const coordinator = new SkillStoreCoordinator(paths, repository, {
      createId: () => ids.shift()!,
      now: () => 2600,
    });
    await coordinator.initialize();

    const imported = await coordinator.importPackage(source);

    assert.equal(imported.package.distributionName, 'fallback-name');
    assert.equal(imported.reused, false);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('surfaces an ambiguous marker without deleting its paths', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-recovery-ambiguous-'));
  const userHome = path.join(temporaryRoot, 'home');
  const database = openFoundryDatabase(':memory:');

  try {
    const paths = new SkillStorePaths(userHome);
    await paths.initialize();
    const operationRoot = path.join(paths.operations, operationId);
    await mkdir(operationRoot);
    await writeFile(path.join(operationRoot, 'operation.json'), '{not-json');
    const userAuthoredPackage = path.join(paths.packages, packageId);
    await mkdir(userAuthoredPackage);
    await writeFile(path.join(userAuthoredPackage, 'SKILL.md'), '# Do not delete\n');
    const coordinator = new SkillStoreCoordinator(
      paths,
      new SkillMetadataRepository(database),
    );

    await assert.rejects(
      () => coordinator.initialize(),
      (error: unknown) => error instanceof SkillOperationError
        && error.code === 'filesystem-unavailable',
    );

    assert.equal(
      await readFile(path.join(userAuthoredPackage, 'SKILL.md'), 'utf8'),
      '# Do not delete\n',
    );
    assert.deepEqual(await readdir(paths.operations), [operationId]);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
