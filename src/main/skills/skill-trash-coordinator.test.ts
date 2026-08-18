import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillOperationError } from './skill-error';
import { SkillInstallationRepository } from './skill-installation-repository';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillOperationQueue } from './skill-operation-queue';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillStorePaths } from './skill-store-paths';
import { SkillTargetRepository } from './skill-target-repository';
import { SkillTrashCoordinator } from './skill-trash-coordinator';

const packageId = '00000000-0000-4000-8000-000000002001';
const revisionId = '00000000-0000-4000-8000-000000002002';
const importOperationId = '00000000-0000-4000-8000-000000002003';
const secondRevisionId = '00000000-0000-4000-8000-000000002004';
const revisionOperationId = '00000000-0000-4000-8000-000000002005';
const trashOperationId = '00000000-0000-4000-8000-000000002006';
const restoreOperationId = '00000000-0000-4000-8000-000000002007';
const permanentOperationId = '00000000-0000-4000-8000-000000002008';

interface TrashFixture {
  temporaryRoot: string;
  source: string;
  database: Database.Database;
  paths: SkillStorePaths;
  metadataRepository: SkillMetadataRepository;
  installationRepository: SkillInstallationRepository;
  storeCoordinator: SkillStoreCoordinator;
  close: () => Promise<void>;
}

test('moves complete Store history to Trash and restores the same Skill identity', async () => {
  const fixture = await createFixture('lifecycle');

  try {
    await writeFile(
      path.join(fixture.paths.packages, packageId, 'SKILL.md'),
      '# Updated\n',
    );
    const revisionIds = [secondRevisionId, revisionOperationId];
    const revisionStore = new SkillStoreCoordinator(
      fixture.paths,
      fixture.metadataRepository,
      { createId: () => revisionIds.shift()!, now: () => 20 },
    );
    await revisionStore.snapshotStorePackage(packageId, 'distribution');
    const operationIds = [trashOperationId, restoreOperationId];
    const trash = createTrashCoordinator(fixture, {
      createId: () => operationIds.shift()!,
      now: () => 30,
    });

    const moved = await trash.movePackageToTrash(packageId);

    assert.equal(moved.package.id, packageId);
    assert.equal(moved.observation.status, 'available');
    assert.deepEqual(fixture.metadataRepository.listActivePackages(), []);
    assert.equal(fixture.metadataRepository.listTrashedPackages()[0]?.id, packageId);
    await assert.rejects(() => readFile(
      path.join(fixture.paths.packages, packageId, 'SKILL.md'),
      'utf8',
    ));
    assert.equal(
      await readFile(
        path.join(fixture.paths.trash, packageId, 'package', 'SKILL.md'),
        'utf8',
      ),
      '# Updated\n',
    );
    const revisionEntries = await readdir(
      path.join(fixture.paths.trash, packageId, 'revisions'),
    );
    assert.deepEqual(revisionEntries.toSorted(compareText), [revisionId, secondRevisionId]);

    const restored = await trash.restoreTrashedPackage(packageId);

    assert.equal(restored.id, packageId);
    assert.equal(await readFile(
      path.join(fixture.paths.packages, packageId, 'SKILL.md'),
      'utf8',
    ), '# Updated\n');
    assert.deepEqual(
      fixture.metadataRepository.listRevisions(packageId).map((revision) => revision.id),
      [secondRevisionId, revisionId],
    );
    assert.deepEqual(fixture.metadataRepository.listTrashedPackages(), []);
    await assert.rejects(() => readdir(path.join(fixture.paths.trash, packageId)));
  } finally {
    await fixture.close();
  }
});

test('blocks Store Deletion while an active installation exists', async () => {
  const fixture = await createFixture('installation-guard');

  try {
    const targetPath = path.join(fixture.temporaryRoot, 'target');
    await mkdir(targetPath);
    const targetRepository = new SkillTargetRepository(fixture.database);
    const target = targetRepository.createCustomTarget({
      displayName: 'Test Target',
      configuredPath: targetPath,
      resolvedPath: targetPath,
      resolvedPathKey: targetPath,
      isWritable: true,
      enabled: true,
      maxScanDepth: 4,
      allowSymlinkEscape: false,
    }).target;
    const storePackage = fixture.metadataRepository.getActivePackage(packageId);
    if (storePackage.storeObservation.status !== 'available') {
      assert.fail('Fixture Store content is unavailable.');
    }
    fixture.installationRepository.adoptInstallation({
      packageId,
      targetId: target.id,
      revisionId,
      distributionName: 'fixture-skill',
      relativePath: 'fixture-skill',
      fingerprint: storePackage.storeObservation.fingerprint,
      observedAt: 10,
    });
    const trash = createTrashCoordinator(fixture);

    await expectSkillError(() => trash.movePackageToTrash(packageId), 'conflict');

    assert.equal(
      await readFile(path.join(fixture.paths.packages, packageId, 'SKILL.md'), 'utf8'),
      '# Fixture\n',
    );
    assert.equal(fixture.metadataRepository.getActivePackage(packageId).id, packageId);
    assert.deepEqual(fixture.metadataRepository.listTrashedPackages(), []);
  } finally {
    await fixture.close();
  }
});

test('requires readable Store content before Store Deletion', async () => {
  const fixture = await createFixture('store-unavailable');
  const activePackage = path.join(fixture.paths.packages, packageId);

  try {
    const trash = createTrashCoordinator(fixture);
    await rm(activePackage, { recursive: true });
    await expectSkillError(() => trash.movePackageToTrash(packageId), 'content-unavailable');
    assert.equal(fixture.metadataRepository.getActivePackage(packageId).id, packageId);

    await symlink(fixture.source, activePackage);
    await expectSkillError(() => trash.movePackageToTrash(packageId), 'content-unavailable');
    assert.equal(fixture.metadataRepository.getActivePackage(packageId).id, packageId);
    assert.deepEqual(fixture.metadataRepository.listTrashedPackages(), []);
  } finally {
    await fixture.close();
  }
});

test('compensates each Trash mutation when its metadata commit fails', async () => {
  const fixture = await createFixture('metadata-compensation');

  try {
    const rejectingDelete = new RejectingTrashMetadataRepository(
      fixture.database,
      'delete',
    );
    const failedDelete = createTrashCoordinator(fixture, {
      metadataRepository: rejectingDelete,
      createId: () => trashOperationId,
    });
    await expectSkillError(
      () => failedDelete.movePackageToTrash(packageId),
      'storage-unavailable',
    );
    assert.equal(await readFile(
      path.join(fixture.paths.packages, packageId, 'SKILL.md'),
      'utf8',
    ), '# Fixture\n');
    assert.deepEqual(await readdir(fixture.paths.trashOperations), []);

    const normalTrash = createTrashCoordinator(fixture, {
      createId: () => trashOperationId,
    });
    await normalTrash.movePackageToTrash(packageId);
    const rejectingRestore = new RejectingTrashMetadataRepository(
      fixture.database,
      'restore',
    );
    const failedRestore = createTrashCoordinator(fixture, {
      metadataRepository: rejectingRestore,
      createId: () => restoreOperationId,
    });
    await expectSkillError(
      () => failedRestore.restoreTrashedPackage(packageId),
      'storage-unavailable',
    );
    assert.equal(await readFile(
      path.join(fixture.paths.trash, packageId, 'package', 'SKILL.md'),
      'utf8',
    ), '# Fixture\n');
    assert.deepEqual(await readdir(fixture.paths.trashOperations), []);

    const rejectingRemove = new RejectingTrashMetadataRepository(
      fixture.database,
      'remove',
    );
    const failedRemove = createTrashCoordinator(fixture, {
      metadataRepository: rejectingRemove,
      createId: () => permanentOperationId,
    });
    await expectSkillError(
      () => failedRemove.removeTrashedPackage(packageId),
      'storage-unavailable',
    );
    assert.equal(await readFile(
      path.join(fixture.paths.trash, packageId, 'package', 'SKILL.md'),
      'utf8',
    ), '# Fixture\n');
    assert.deepEqual(await readdir(fixture.paths.trashOperations), []);
  } finally {
    await fixture.close();
  }
});

test('recovers committed delete, restore, and permanent removal cleanup', async () => {
  const fixture = await createFixture('committed-recovery');
  try {
    const failedDeleteCleanup = createTrashCoordinator(fixture, {
      createId: () => trashOperationId,
      removePath: rejectTrashCleanup,
    });
    await failedDeleteCleanup.movePackageToTrash(packageId);
    assert.deepEqual(await readdir(fixture.paths.trashOperations), [trashOperationId]);
    await createTrashCoordinator(fixture).initialize();
    assert.deepEqual(await readdir(fixture.paths.trashOperations), []);

    const failedRestoreCleanup = createTrashCoordinator(fixture, {
      createId: () => restoreOperationId,
      removePath: rejectTrashCleanup,
    });
    await failedRestoreCleanup.restoreTrashedPackage(packageId);
    assert.deepEqual(await readdir(fixture.paths.trashOperations), [restoreOperationId]);
    await createTrashCoordinator(fixture).initialize();
    assert.deepEqual(await readdir(fixture.paths.trashOperations), []);

    await createTrashCoordinator(fixture, {
      createId: () => trashOperationId,
    }).movePackageToTrash(packageId);
    const failedRemoveCleanup = createTrashCoordinator(fixture, {
      createId: () => permanentOperationId,
      removePath: rejectTrashCleanup,
    });
    await failedRemoveCleanup.removeTrashedPackage(packageId);
    assert.equal(fixture.metadataRepository.isPackageRemoved(packageId), true);
    assert.deepEqual(await readdir(fixture.paths.trashOperations), [permanentOperationId]);

    await createTrashCoordinator(fixture).initialize();

    assert.deepEqual(await readdir(fixture.paths.trashOperations), []);
    assert.throws(() => fixture.metadataRepository.getTrashedPackage(packageId));
    await assert.rejects(() => readdir(path.join(fixture.paths.trash, packageId)));
  } finally {
    await fixture.close();
  }
});

test('recovers interrupted pre-commit moves without changing metadata state', async () => {
  const interruptedDeleteFixture = await createFixture('interrupted-delete');

  try {
    const operationRoot = path.join(
      interruptedDeleteFixture.paths.trashOperations,
      trashOperationId,
    );
    const stagedContent = path.join(operationRoot, 'content');
    await mkdir(stagedContent, { recursive: true });
    await writeMarker(operationRoot, {
      kind: 'delete',
      phase: 'prepared',
      operationId: trashOperationId,
      packageId,
    });
    await rename(
      path.join(interruptedDeleteFixture.paths.packages, packageId),
      path.join(stagedContent, 'package'),
    );

    await createTrashCoordinator(interruptedDeleteFixture).initialize();

    assert.equal(await readFile(
      path.join(interruptedDeleteFixture.paths.packages, packageId, 'SKILL.md'),
      'utf8',
    ), '# Fixture\n');
    assert.equal(
      interruptedDeleteFixture.metadataRepository.getActivePackage(packageId).id,
      packageId,
    );
    assert.deepEqual(await readdir(interruptedDeleteFixture.paths.trashOperations), []);
  } finally {
    await interruptedDeleteFixture.close();
  }

  const restoreFixture = await createFixture('interrupted-restore');
  try {
    await createTrashCoordinator(restoreFixture, {
      createId: () => trashOperationId,
    }).movePackageToTrash(packageId);
    const restoreRoot = path.join(
      restoreFixture.paths.trashOperations,
      restoreOperationId,
    );
    const restoreStage = path.join(restoreRoot, 'content');
    await mkdir(restoreRoot, { recursive: true });
    await rename(path.join(restoreFixture.paths.trash, packageId), restoreStage);
    await rename(
      path.join(restoreStage, 'package'),
      path.join(restoreFixture.paths.packages, packageId),
    );
    await writeMarker(restoreRoot, {
      kind: 'restore',
      phase: 'content-staged',
      operationId: restoreOperationId,
      packageId,
    });

    await createTrashCoordinator(restoreFixture).initialize();

    assert.equal(await readFile(
      path.join(restoreFixture.paths.trash, packageId, 'package', 'SKILL.md'),
      'utf8',
    ), '# Fixture\n');
    assert.equal(
      restoreFixture.metadataRepository.getTrashedPackage(packageId).id,
      packageId,
    );
    assert.deepEqual(await readdir(restoreFixture.paths.trashOperations), []);
  } finally {
    await restoreFixture.close();
  }

  const interruptedRemoveFixture = await createFixture('interrupted-remove');
  try {
    await createTrashCoordinator(interruptedRemoveFixture, {
      createId: () => trashOperationId,
    }).movePackageToTrash(packageId);
    const operationRoot = path.join(
      interruptedRemoveFixture.paths.trashOperations,
      permanentOperationId,
    );
    await mkdir(operationRoot);
    await writeMarker(operationRoot, {
      kind: 'remove',
      phase: 'prepared',
      operationId: permanentOperationId,
      packageId,
      hadContent: true,
    });

    await createTrashCoordinator(interruptedRemoveFixture).initialize();

    assert.equal(await readFile(
      path.join(interruptedRemoveFixture.paths.trash, packageId, 'package', 'SKILL.md'),
      'utf8',
    ), '# Fixture\n');
    assert.equal(
      interruptedRemoveFixture.metadataRepository.getTrashedPackage(packageId).id,
      packageId,
    );
    assert.deepEqual(await readdir(interruptedRemoveFixture.paths.trashOperations), []);
  } finally {
    await interruptedRemoveFixture.close();
  }
});

test('preserves ambiguous interrupted operation paths for explicit recovery', async () => {
  const fixture = await createFixture('ambiguous-recovery');

  try {
    const operationRoot = path.join(fixture.paths.trashOperations, trashOperationId);
    const stagedPackage = path.join(operationRoot, 'content', 'package');
    await mkdir(path.dirname(stagedPackage), { recursive: true });
    await cp(path.join(fixture.paths.packages, packageId), stagedPackage, {
      recursive: true,
    });
    await writeMarker(operationRoot, {
      kind: 'delete',
      phase: 'content-staged',
      operationId: trashOperationId,
      packageId,
    });

    await expectSkillError(
      () => createTrashCoordinator(fixture).initialize(),
      'filesystem-unavailable',
    );

    assert.equal(await readFile(
      path.join(fixture.paths.packages, packageId, 'SKILL.md'),
      'utf8',
    ), '# Fixture\n');
    assert.equal(await readFile(path.join(stagedPackage, 'SKILL.md'), 'utf8'), '# Fixture\n');
    assert.deepEqual(await readdir(fixture.paths.trashOperations), [trashOperationId]);
  } finally {
    await fixture.close();
  }
});

test('permanently removes missing Trash content and reports partial Empty Trash failures', async () => {
  const first = await createFixture('permanent-missing');

  try {
    await createTrashCoordinator(first, {
      createId: () => trashOperationId,
    }).movePackageToTrash(packageId);
    await rm(path.join(first.paths.trash, packageId), { recursive: true });
    await createTrashCoordinator(first, {
      createId: () => permanentOperationId,
    }).removeTrashedPackage(packageId);
    assert.equal(first.metadataRepository.isPackageRemoved(packageId), true);
  } finally {
    await first.close();
  }

  const fixture = await createFixture('empty-partial');
  const secondPackageId = '00000000-0000-4000-8000-000000002101';
  const secondImportRevisionId = '00000000-0000-4000-8000-000000002102';
  const secondImportOperationId = '00000000-0000-4000-8000-000000002103';
  const secondDeleteOperationId = '00000000-0000-4000-8000-000000002104';
  const externalPath = path.join(fixture.temporaryRoot, 'external-content');

  try {
    const secondSource = path.join(fixture.temporaryRoot, 'second-source');
    await mkdir(secondSource);
    await writeFile(path.join(secondSource, 'SKILL.md'), '# Second\n');
    const importIds = [
      secondPackageId,
      secondImportRevisionId,
      secondImportOperationId,
    ];
    await new SkillStoreCoordinator(fixture.paths, fixture.metadataRepository, {
      createId: () => importIds.shift()!,
      now: () => 20,
    }).importPackage(secondSource);
    const trashOperationIds = [trashOperationId, secondDeleteOperationId];
    const trash = createTrashCoordinator(fixture, {
      createId: () => trashOperationIds.shift()!,
      now: () => 30,
    });
    await trash.movePackageToTrash(packageId);
    await trash.movePackageToTrash(secondPackageId);
    await mkdir(externalPath);
    await writeFile(path.join(externalPath, 'keep.txt'), 'keep');
    await rm(path.join(fixture.paths.trash, packageId), { recursive: true });
    await symlink(externalPath, path.join(fixture.paths.trash, packageId));

    const result = await createTrashCoordinator(fixture).emptyTrash();

    assert.deepEqual(result.removedIds, [secondPackageId]);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0]?.skillId, packageId);
    assert.equal(result.failures[0]?.error.code, 'filesystem-unavailable');
    assert.equal(await readFile(path.join(externalPath, 'keep.txt'), 'utf8'), 'keep');
    assert.equal(fixture.metadataRepository.getTrashedPackage(packageId).id, packageId);
    assert.equal(fixture.metadataRepository.isPackageRemoved(secondPackageId), true);
  } finally {
    await fixture.close();
  }
});

class RejectingTrashMetadataRepository extends SkillMetadataRepository {
  constructor(
    database: Database.Database,
    private readonly rejectedOperation: 'delete' | 'restore' | 'remove',
  ) {
    super(database);
  }

  override markPackageTrashed(
    packageIdValue: unknown,
    trashedAtValue: unknown,
  ): ReturnType<SkillMetadataRepository['markPackageTrashed']> {
    if (this.rejectedOperation === 'delete') {
      throw new SkillOperationError('storage-unavailable', 'Injected metadata failure.');
    }
    return super.markPackageTrashed(packageIdValue, trashedAtValue);
  }

  override restoreTrashedPackage(
    packageIdValue: unknown,
    observation: Parameters<SkillMetadataRepository['restoreTrashedPackage']>[1],
    restoredAtValue: unknown,
  ): ReturnType<SkillMetadataRepository['restoreTrashedPackage']> {
    if (this.rejectedOperation === 'restore') {
      throw new SkillOperationError('storage-unavailable', 'Injected metadata failure.');
    }
    return super.restoreTrashedPackage(packageIdValue, observation, restoredAtValue);
  }

  override markTrashedPackageRemoved(
    packageIdValue: unknown,
    removedAtValue: unknown,
  ): void {
    if (this.rejectedOperation === 'remove') {
      throw new SkillOperationError('storage-unavailable', 'Injected metadata failure.');
    }
    super.markTrashedPackageRemoved(packageIdValue, removedAtValue);
  }
}

interface CreateTrashCoordinatorOverrides {
  metadataRepository?: SkillMetadataRepository;
  createId?: () => string;
  now?: () => number;
  removePath?: (targetPath: string) => Promise<void>;
}

function createTrashCoordinator(
  fixture: TrashFixture,
  overrides: CreateTrashCoordinatorOverrides = {},
): SkillTrashCoordinator {
  return new SkillTrashCoordinator({
    paths: fixture.paths,
    metadataRepository: overrides.metadataRepository ?? fixture.metadataRepository,
    installationRepository: fixture.installationRepository,
    operationQueue: new SkillOperationQueue(),
    createId: overrides.createId ?? randomUUID,
    now: overrides.now ?? (() => 40),
    removePath: overrides.removePath,
  });
}

async function createFixture(name: string): Promise<TrashFixture> {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), `foundry-trash-${name}-`));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(path.join(source, 'references'), { recursive: true });
    await writeFile(path.join(source, 'SKILL.md'), '# Fixture\n');
    await writeFile(path.join(source, 'references', 'guide.md'), 'Guide\n');
    const paths = new SkillStorePaths(userHome);
    const metadataRepository = new SkillMetadataRepository(database);
    const installationRepository = new SkillInstallationRepository(database);
    const importIds = [packageId, revisionId, importOperationId];
    const storeCoordinator = new SkillStoreCoordinator(paths, metadataRepository, {
      createId: () => importIds.shift()!,
      now: () => 10,
    });
    await storeCoordinator.initialize();
    await storeCoordinator.importPackage(source);
    return {
      temporaryRoot,
      source,
      database,
      paths,
      metadataRepository,
      installationRepository,
      storeCoordinator,
      close: async () => {
        database.close();
        await rm(temporaryRoot, { recursive: true, force: true });
      },
    };
  } catch (error) {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

async function expectSkillError(
  operation: () => Promise<unknown>,
  code: SkillOperationError['code'],
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => (
    error instanceof SkillOperationError && error.code === code
  ));
}

interface TestOperationMarker {
  kind: 'delete' | 'restore' | 'remove';
  phase: string;
  operationId: string;
  packageId: string;
  hadContent?: boolean;
}

async function writeMarker(
  operationRoot: string,
  marker: TestOperationMarker,
): Promise<void> {
  await writeFile(path.join(operationRoot, 'operation.json'), `${JSON.stringify({
    version: 1,
    createdAt: 20,
    ...marker,
  })}\n`);
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function rejectTrashCleanup(): Promise<void> {
  return Promise.reject(
    Object.assign(new Error('Injected cleanup failure.'), { code: 'EBUSY' }),
  );
}
