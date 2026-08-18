import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { test } from 'vitest';
import { deriveInstallationState } from '../../shared/skill-contract';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillOperationError } from './skill-error';
import {
  SkillInstallationRepository,
} from './skill-installation-repository';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillOperationQueue } from './skill-operation-queue';
import { fingerprintSkillPackage } from './skill-package-fingerprint';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillStorePaths } from './skill-store-paths';
import {
  normalizeResolvedPathKey,
  resolvePhysicalPath,
} from './skill-target-adapters';
import { SkillTargetMutationCoordinator } from './skill-target-mutation-coordinator';
import { SkillTargetRepository } from './skill-target-repository';

const packageId = '00000000-0000-4000-8000-000000001001';
const revisionId = '00000000-0000-4000-8000-000000001002';
const importOperationId = '00000000-0000-4000-8000-000000001003';
const interruptedRecordId = '00000000-0000-4000-8000-000000001004';
const interruptedOperationId = '00000000-0000-4000-8000-000000001005';

interface MutationFixture {
  temporaryRoot: string;
  database: Database.Database;
  paths: SkillStorePaths;
  metadataRepository: SkillMetadataRepository;
  targetRepository: SkillTargetRepository;
  installationRepository: SkillInstallationRepository;
  storeCoordinator: SkillStoreCoordinator;
  operationQueue: SkillOperationQueue;
  targetPaths: string[];
  targetIds: string[];
  close: () => Promise<void>;
}

test('normalizes conflicts and reports partial multi-target distribution', async () => {
  const fixture = await createFixture('partial', 3);

  try {
    const secondSource = path.join(fixture.temporaryRoot, 'second-source');
    await createSkillPackage(secondSource, '# Different package\n');
    const secondPackage = await fixture.storeCoordinator.importPackage(secondSource);
    const coordinator = createCoordinator(fixture);
    const occupied = await coordinator.distribute({
      skillId: secondPackage.package.id,
      targetIds: [fixture.targetIds[2]],
    });
    assert.equal(occupied.targets[0]?.ok, true);

    const unmanagedPath = path.join(fixture.targetPaths[1], 'SHARED-SKILL');
    await createSkillPackage(unmanagedPath, '# Unmanaged\n');
    const preflight = await coordinator.preflightDistribution({
      skillId: packageId,
      targetIds: fixture.targetIds,
    });

    assert.equal(preflight.targets[0]?.status, 'ready');
    assert.deepEqual(preflight.targets.slice(1).map((target) => (
      target.status === 'conflict' ? target.code : null
    )), ['untracked-content', 'name-conflict']);

    const distributed = await coordinator.distribute({
      skillId: packageId,
      targetIds: fixture.targetIds,
    });
    assert.equal(distributed.revisionId, revisionId);
    assert.deepEqual(distributed.targets.map((target) => target.ok), [true, false, false]);
    assert.equal(
      await readFile(path.join(fixture.targetPaths[0], 'shared-skill', 'SKILL.md'), 'utf8'),
      skillManifest('# Initial\n'),
    );
    assert.equal(
      await readFile(path.join(unmanagedPath, 'SKILL.md'), 'utf8'),
      skillManifest('# Unmanaged\n'),
    );
    const installation = fixture.installationRepository.listActiveInstallations(
      fixture.targetIds[0],
    )[0];
    const record = fixture.installationRepository.getLatestDistributionRecord(
      installation.id,
    )!;
    assert.equal(record.operation, 'distribution');
    assert.equal(
      record.fingerprint,
      await fingerprintSkillPackage(path.join(fixture.targetPaths[0], 'shared-skill')),
    );
  } finally {
    await fixture.close();
  }
});

test('keeps an installation Outdated until explicit same-package replacement', async () => {
  const fixture = await createFixture('outdated', 1);

  try {
    const coordinator = createCoordinator(fixture);
    const first = await coordinator.distribute({
      skillId: packageId,
      targetIds: fixture.targetIds,
    });
    assert.equal(first.targets[0]?.ok, true);
    const installation = fixture.installationRepository.listActiveInstallations()[0];
    const targetPackage = path.join(fixture.targetPaths[0], 'shared-skill');
    const storePackage = path.join(fixture.paths.packages, packageId);

    await writeFile(path.join(storePackage, 'SKILL.md'), skillManifest('# Store update\n'));
    await fixture.storeCoordinator.reconcileStorePackages();
    const store = fixture.metadataRepository.getActivePackage(packageId);
    const baseline = fixture.installationRepository.getLatestDistributionRecord(
      installation.id,
    )!;
    assert.deepEqual(deriveInstallationState({
      store: store.storeObservation,
      distribution: {
        revisionId: baseline.revisionId,
        fingerprint: baseline.fingerprint,
        recordedAt: baseline.createdAt,
      },
      target: installation.targetObservation,
    }), { kind: 'known', state: 'outdated' });
    assert.equal(await readFile(path.join(targetPackage, 'SKILL.md'), 'utf8'), skillManifest('# Initial\n'));

    const updated = await coordinator.distribute({
      skillId: packageId,
      targetIds: fixture.targetIds,
    });
    const updatedTarget = updated.targets[0];
    if (!updatedTarget.ok) {
      assert.fail(updatedTarget.error.message);
    }
    assert.equal(updatedTarget.installationId, installation.id);
    assert.equal(await readFile(path.join(targetPackage, 'SKILL.md'), 'utf8'), skillManifest('# Store update\n'));
    assert.equal(
      fixture.database.prepare(`
        SELECT COUNT(*) FROM skill_distribution_records WHERE installation_id = ?
      `).pluck().get(installation.id),
      2,
    );
  } finally {
    await fixture.close();
  }
});

test('rejects a changed staging copy without replacing the installed bytes', async () => {
  const fixture = await createFixture('staging-verification', 1);

  try {
    const initialCoordinator = createCoordinator(fixture);
    await initialCoordinator.distribute({
      skillId: packageId,
      targetIds: fixture.targetIds,
    });
    const installation = fixture.installationRepository.listActiveInstallations()[0];
    const storePackage = path.join(fixture.paths.packages, packageId);
    const targetPackage = path.join(fixture.targetPaths[0], 'shared-skill');
    await writeFile(path.join(storePackage, 'SKILL.md'), skillManifest('# Store update\n'));

    const coordinator = createCoordinator(fixture, {
      copyPackage: async (source, destination) => {
        await copyPackage(source, destination);
        await writeFile(path.join(destination, 'SKILL.md'), skillManifest('# Corrupted stage\n'));
      },
    });
    const result = await coordinator.distribute({
      skillId: packageId,
      targetIds: fixture.targetIds,
    });

    const targetResult = result.targets[0];
    if (targetResult.ok) {
      assert.fail('The corrupted stage was distributed.');
    }
    assert.equal(targetResult.error.code, 'content-unavailable');
    assert.equal(await readFile(path.join(targetPackage, 'SKILL.md'), 'utf8'), skillManifest('# Initial\n'));
    assert.equal(
      fixture.database.prepare(`
        SELECT COUNT(*) FROM skill_distribution_records WHERE installation_id = ?
      `).pluck().get(installation.id),
      1,
    );
    assert.deepEqual(await readdir(fixture.paths.targetOperations), []);
    const targetEntries = await readdir(fixture.targetPaths[0]);
    assert.deepEqual(targetEntries.filter((entry) => entry.startsWith('.foundry-')), []);
  } finally {
    await fixture.close();
  }
});

test('rechecks untracked content created after preflight and preserves it', async () => {
  const fixture = await createFixture('toctou', 1);

  try {
    const finalPath = path.join(fixture.targetPaths[0], 'shared-skill');
    const coordinator = createCoordinator(fixture, {
      copyPackage: async (source, destination) => {
        await copyPackage(source, destination);
        await createSkillPackage(finalPath, '# External install\n');
      },
    });
    const result = await coordinator.distribute({
      skillId: packageId,
      targetIds: fixture.targetIds,
    });

    const targetResult = result.targets[0];
    if (targetResult.ok) {
      assert.fail('The untracked content was replaced.');
    }
    assert.equal(targetResult.error.code, 'conflict');
    assert.equal(
      await readFile(path.join(finalPath, 'SKILL.md'), 'utf8'),
      skillManifest('# External install\n'),
    );
    assert.deepEqual(fixture.installationRepository.listActiveInstallations(), []);
    assert.deepEqual(await readdir(fixture.paths.targetOperations), []);
  } finally {
    await fixture.close();
  }
});

test('recovers an interrupted replacement whose metadata commit did not happen', async () => {
  const fixture = await createFixture('replacement-recovery', 1);

  try {
    const initialCoordinator = createCoordinator(fixture);
    await initialCoordinator.distribute({
      skillId: packageId,
      targetIds: fixture.targetIds,
    });
    const targetPackage = path.join(fixture.targetPaths[0], 'shared-skill');
    await writeFile(
      path.join(fixture.paths.packages, packageId, 'SKILL.md'),
      skillManifest('# Store update\n'),
    );
    const rejectingRepository = new RejectingDistributionRepository(fixture.database);
    const ids = [interruptedRecordId, interruptedOperationId];
    const resolvedTargetPackage = path.join(
      await resolvePhysicalPath(fixture.targetPaths[0]),
      'shared-skill',
    );
    const interruptedCoordinator = new SkillTargetMutationCoordinator({
      paths: fixture.paths,
      metadataRepository: fixture.metadataRepository,
      targetRepository: fixture.targetRepository,
      installationRepository: rejectingRepository,
      storeCoordinator: fixture.storeCoordinator,
      operationQueue: fixture.operationQueue,
      createId: () => ids.shift() ?? randomUUID(),
      removePath: (targetPath) => {
        if (targetPath === resolvedTargetPackage) {
          return Promise.reject(Object.assign(new Error('injected compensation failure'), {
            code: 'EBUSY',
          }));
        }
        return rm(targetPath, { recursive: true, force: true });
      },
    });

    const interrupted = await interruptedCoordinator.distribute({
      skillId: packageId,
      targetIds: fixture.targetIds,
    });
    assert.equal(interrupted.targets[0]?.ok, false);
    assert.equal(await readFile(path.join(targetPackage, 'SKILL.md'), 'utf8'), skillManifest('# Store update\n'));
    assert.deepEqual(await readdir(fixture.paths.targetOperations), [interruptedOperationId]);

    const recoveredCoordinator = createCoordinator(fixture);
    await recoveredCoordinator.initialize();

    assert.equal(await readFile(path.join(targetPackage, 'SKILL.md'), 'utf8'), skillManifest('# Initial\n'));
    assert.deepEqual(await readdir(fixture.paths.targetOperations), []);
    assert.equal(
      fixture.database.prepare('SELECT COUNT(*) FROM skill_distribution_records').pluck().get(),
      1,
    );
  } finally {
    await fixture.close();
  }
});

test('serializes concurrent mutations through the shared subsystem queue', async () => {
  const fixture = await createFixture('serialization', 1);

  try {
    const firstCopyStarted = Promise.withResolvers<undefined>();
    const releaseFirstCopy = Promise.withResolvers<undefined>();
    let activeCopies = 0;
    let copyCalls = 0;
    let maximumActiveCopies = 0;
    const coordinator = createCoordinator(fixture, {
      copyPackage: async (source, destination) => {
        copyCalls += 1;
        activeCopies += 1;
        maximumActiveCopies = Math.max(maximumActiveCopies, activeCopies);
        if (copyCalls === 1) {
          firstCopyStarted.resolve(undefined);
          await releaseFirstCopy.promise;
        }
        await copyPackage(source, destination);
        activeCopies -= 1;
      },
    });
    const input = { skillId: packageId, targetIds: fixture.targetIds };
    const first = coordinator.distribute(input);
    await firstCopyStarted.promise;
    const second = coordinator.distribute(input);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(copyCalls, 1);

    releaseFirstCopy.resolve(undefined);
    const [firstResult, secondResult] = await Promise.all([first, second]);

    assert.equal(firstResult.targets[0]?.ok, true);
    assert.equal(secondResult.targets[0]?.ok, true);
    assert.equal(maximumActiveCopies, 1);
    const installation = fixture.installationRepository.listActiveInstallations()[0];
    assert.equal(
      fixture.database.prepare(`
        SELECT COUNT(*) FROM skill_distribution_records WHERE installation_id = ?
      `).pluck().get(installation.id),
      2,
    );
  } finally {
    await fixture.close();
  }
});

test('keeps Promote, Import as New, Restore, and Uninstall identity effects distinct', async () => {
  const fixture = await createFixture('drift-actions', 1);

  try {
    const coordinator = createCoordinator(fixture);
    await coordinator.distribute({ skillId: packageId, targetIds: fixture.targetIds });
    const installation = fixture.installationRepository.listActiveInstallations()[0];
    const targetPackage = path.join(fixture.targetPaths[0], 'shared-skill');
    await writeFile(path.join(targetPackage, 'SKILL.md'), skillManifest('# Local edit\n'));

    const promoted = await coordinator.promoteInstallation({
      installationId: installation.id,
    });
    assert.equal(promoted.package.id, packageId);
    assert.equal(promoted.revision.reason, 'promotion');
    assert.equal(
      await readFile(path.join(fixture.paths.packages, packageId, 'SKILL.md'), 'utf8'),
      skillManifest('# Local edit\n'),
    );
    const baselineAfterPromotion = fixture.installationRepository
      .getLatestDistributionRecord(installation.id)!;
    assert.equal(baselineAfterPromotion.sequenceNumber, 1);
    assert.deepEqual(deriveInstallationState({
      store: promoted.package.storeObservation,
      distribution: {
        revisionId: baselineAfterPromotion.revisionId,
        fingerprint: baselineAfterPromotion.fingerprint,
        recordedAt: baselineAfterPromotion.createdAt,
      },
      target: fixture.installationRepository.getActiveInstallation(installation.id)
        .targetObservation,
    }), { kind: 'known', state: 'diverged' });

    const imported = await coordinator.importInstallationAsNew({
      installationId: installation.id,
    });
    assert.notEqual(imported.package.id, packageId);
    assert.equal(
      fixture.installationRepository.getActiveInstallation(installation.id).packageId,
      packageId,
    );

    await rm(targetPackage, { recursive: true, force: true });
    const restored = await coordinator.restoreInstallation({
      installationId: installation.id,
    });
    if (!restored.ok) {
      assert.fail(restored.error.message);
    }
    assert.equal(restored.installationId, installation.id);
    assert.equal(
      fixture.installationRepository.getLatestDistributionRecord(installation.id)?.operation,
      'restore',
    );
    assert.equal(await readFile(path.join(targetPackage, 'SKILL.md'), 'utf8'), skillManifest('# Local edit\n'));

    await coordinator.uninstall({ installationId: installation.id });
    assert.equal(fixture.installationRepository.isInstallationActive(installation.id), false);
    assert.deepEqual(await readdir(fixture.targetPaths[0]), []);
    assert.equal(
      fixture.database.prepare(`
        SELECT COUNT(*) FROM skill_distribution_records WHERE installation_id = ?
      `).pluck().get(installation.id),
      2,
    );
  } finally {
    await fixture.close();
  }
});

class RejectingDistributionRepository extends SkillInstallationRepository {
  override recordDistribution(
    _input: Parameters<SkillInstallationRepository['recordDistribution']>[0],
  ): never {
    throw new SkillOperationError('storage-unavailable', 'Injected metadata failure.');
  }
}

async function createFixture(
  name: string,
  targetCount: number,
): Promise<MutationFixture> {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), `foundry-skill-${name}-`));
  const userHome = path.join(temporaryRoot, 'home');
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');
  let clock = 100;
  const now = () => ++clock;

  try {
    await createSkillPackage(source, '# Initial\n');
    const paths = new SkillStorePaths(userHome);
    const metadataRepository = new SkillMetadataRepository(database);
    const importIds = [packageId, revisionId, importOperationId];
    const storeCoordinator = new SkillStoreCoordinator(paths, metadataRepository, {
      createId: () => importIds.shift() ?? randomUUID(),
      now,
    });
    await storeCoordinator.initialize();
    await storeCoordinator.importPackage(source);
    const targetRepository = new SkillTargetRepository(database, { now });
    const targetPaths: string[] = [];
    const targetIds: string[] = [];
    for (let index = 0; index < targetCount; index += 1) {
      const targetPath = path.join(temporaryRoot, `target-${index + 1}`);
      await mkdir(targetPath);
      const resolvedPath = await resolvePhysicalPath(targetPath);
      const target = targetRepository.createCustomTarget({
        displayName: `Target ${index + 1}`,
        configuredPath: targetPath,
        resolvedPath,
        resolvedPathKey: normalizeResolvedPathKey(resolvedPath),
        isWritable: true,
        enabled: true,
        maxScanDepth: 4,
        allowSymlinkEscape: false,
      }).target;
      targetPaths.push(targetPath);
      targetIds.push(target.id);
    }
    const installationRepository = new SkillInstallationRepository(database, { now });
    const operationQueue = new SkillOperationQueue();
    return {
      temporaryRoot,
      database,
      paths,
      metadataRepository,
      targetRepository,
      installationRepository,
      storeCoordinator,
      operationQueue,
      targetPaths,
      targetIds,
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

function createCoordinator(
  fixture: MutationFixture,
  overrides: {
    copyPackage?: (source: string, destination: string) => Promise<void>;
  } = {},
): SkillTargetMutationCoordinator {
  return new SkillTargetMutationCoordinator({
    paths: fixture.paths,
    metadataRepository: fixture.metadataRepository,
    targetRepository: fixture.targetRepository,
    installationRepository: fixture.installationRepository,
    storeCoordinator: fixture.storeCoordinator,
    operationQueue: fixture.operationQueue,
    copyPackage: overrides.copyPackage,
  });
}

async function createSkillPackage(packageRoot: string, body: string): Promise<void> {
  await mkdir(packageRoot, { recursive: true });
  await writeFile(path.join(packageRoot, 'SKILL.md'), skillManifest(body));
}

function skillManifest(body: string): string {
  return `---\nname: shared-skill\ndescription: Test Skill\n---\n\n${body}`;
}

async function copyPackage(source: string, destination: string): Promise<void> {
  await cp(source, destination, {
    recursive: true,
    dereference: false,
    errorOnExist: true,
    force: false,
    verbatimSymlinks: true,
  });
}
