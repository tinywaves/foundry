import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillClawHubProvider } from './skill-clawhub-provider';
import { SkillDiscoveryCoordinator } from './skill-discovery-coordinator';
import { SkillFileCoordinator } from './skill-file-coordinator';
import { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import { SkillInstallationRepository } from './skill-installation-repository';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillRemoteAcquisitionCoordinator } from './skill-remote-acquisition';
import { SkillRemoteDiscoveryCoordinator } from './skill-remote-discovery-coordinator';
import { SkillProviderHttpClient } from './skill-provider-http-client';
import { SkillService } from './skill-service';
import { SkillStoreCoordinator } from './skill-store-coordinator';
import { SkillStorePaths } from './skill-store-paths';
import { SkillSourceRepository } from './skill-source-repository';
import { SkillSkillsShProvider } from './skill-skills-sh-provider';
import { SkillOperationQueue } from './skill-operation-queue';
import { SkillTargetRepository } from './skill-target-repository';
import { resolveBuiltInSkillTargets } from './skill-target-adapters';
import { SkillTargetMutationCoordinator } from './skill-target-mutation-coordinator';
import { SkillTrashCoordinator } from './skill-trash-coordinator';
import { SkillUpdateCoordinator } from './skill-update-coordinator';
import { SkillWatchCoordinator } from './skill-watch-coordinator';

const packageId = '00000000-0000-4000-8000-000000000901';
const revisionId = '00000000-0000-4000-8000-000000000902';
const targetId = '00000000-0000-4000-8000-000000000903';
const builtInTargetId = '00000000-0000-4000-8000-000000000907';
const installationId = '00000000-0000-4000-8000-000000000904';
const recordId = '00000000-0000-4000-8000-000000000905';
const candidateId = '00000000-0000-4000-8000-000000000906';
const fingerprint = 'a'.repeat(64);

test('lists derived installation state and reveals only paths resolved from known IDs', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-service-'));
  const database = openFoundryDatabase(':memory:');
  const revealedPaths: string[] = [];
  const openedUrls: string[] = [];

  try {
    const paths = new SkillStorePaths(userHome);
    await paths.initialize();
    const metadataRepository = new SkillMetadataRepository(database);
    metadataRepository.createImportedPackage({
      id: packageId,
      distributionName: 'shared-skill',
      fingerprint,
      revisionId,
      createdAt: 10,
    });
    const targetIds = [targetId, builtInTargetId];
    const targetRepository = new SkillTargetRepository(database, {
      createId: () => targetIds.shift()!,
      now: () => 10,
    });
    const targetPath = path.join(userHome, 'target');
    targetRepository.createCustomTarget({
      displayName: 'Custom Target',
      configuredPath: targetPath,
      resolvedPath: targetPath,
      resolvedPathKey: targetPath,
      isWritable: true,
      enabled: true,
      maxScanDepth: 4,
      allowSymlinkEscape: false,
    });
    const installationIds = [installationId, recordId];
    const installationRepository = new SkillInstallationRepository(database, {
      createId: () => installationIds.shift()!,
      now: () => 10,
    });
    installationRepository.adoptInstallation({
      packageId,
      targetId,
      revisionId,
      distributionName: 'shared-skill',
      relativePath: 'shared-skill',
      fingerprint,
      observedAt: 10,
    });
    const service = createService({
      database,
      userHome,
      metadataRepository,
      targetRepository,
      installationRepository,
      revealPath: (targetPath) => {
        revealedPaths.push(targetPath);
      },
      openExternal: (url) => {
        openedUrls.push(url);
      },
    });

    assert.equal(service.listStorePackages()[0]?.id, packageId);
    assert.equal(service.getStorePackage(packageId).distributionName, 'shared-skill');
    assert.equal(service.listInstallations({ skillId: packageId })[0]?.syncStatus, 'synced');
    metadataRepository.updateStoreObservation(packageId, {
      status: 'available',
      fingerprint: 'b'.repeat(64),
      observedAt: 20,
    });
    const differentInstallation = service.listInstallations({ skillId: packageId })[0];
    assert.equal(differentInstallation.syncStatus, 'different');
    assert.equal(differentInstallation.storeObservation.status, 'available');
    assert.equal(differentInstallation.storeObservation.fingerprint, 'b'.repeat(64));
    assert.equal(differentInstallation.targetObservation.status, 'available');
    assert.equal(differentInstallation.targetObservation.fingerprint, fingerprint);
    assert.equal(differentInstallation.distribution?.fingerprint, fingerprint);
    await service.revealPackage(packageId);
    await service.revealTarget(targetId);
    assert.deepEqual(revealedPaths, [
      path.join(paths.packages, packageId),
      targetPath,
    ]);
    await assert.rejects(() => service.revealPackage(candidateId));
    await assert.rejects(() => service.revealTarget(candidateId));
    await assert.rejects(() => service.openTargetDocumentation(targetId));

    const definitions = await resolveBuiltInSkillTargets({
      userHomeDirectory: userHome,
      environment: {},
    });
    const codexDefinition = definitions.find((item) => item.kind === 'codex-legacy')!;
    const [codexTarget] = targetRepository.synchronizeBuiltInTargets([codexDefinition]);
    await service.openTargetDocumentation(codexTarget.id);
    assert.deepEqual(openedUrls, ['https://developers.openai.com/codex/skills']);
  } finally {
    database.close();
    await rm(userHome, { recursive: true, force: true });
  }
});

test('creates a Custom Target only from an opaque candidate owned by the requesting window', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-custom-target-'));
  const selectedPath = path.join(userHome, 'selected-skills');
  const database = openFoundryDatabase(':memory:');

  try {
    await mkdir(selectedPath);
    const metadataRepository = new SkillMetadataRepository(database);
    const targetRepository = new SkillTargetRepository(database, {
      createId: () => targetId,
      now: () => 20,
    });
    const installationRepository = new SkillInstallationRepository(database);
    const service = createService({
      database,
      userHome,
      metadataRepository,
      targetRepository,
      installationRepository,
      revealPath: () => {},
      createCandidateId: () => candidateId,
    });
    service.registerWindowOwner(1);
    service.registerWindowOwner(2);
    const candidate = await service.registerCustomTargetCandidate(1, selectedPath);

    assert.deepEqual(candidate, {
      candidateId,
      suggestedName: 'selected-skills',
    });
    await assert.rejects(() => service.createCustomTarget(2, {
      candidateId,
      displayName: 'Selected Skills',
      enabled: true,
      maxScanDepth: 4,
      allowSymlinkEscape: false,
    }));
    const created = await service.createCustomTarget(1, {
      candidateId,
      displayName: 'Selected Skills',
      enabled: true,
      maxScanDepth: 4,
      allowSymlinkEscape: false,
    });
    assert.equal(created.target.id, targetId);
    assert.equal(created.target.configuredPath, selectedPath);
    assert.equal(created.reused, false);
    await assert.rejects(() => service.createCustomTarget(1, {
      candidateId,
      displayName: 'Selected Skills',
      enabled: true,
      maxScanDepth: 4,
      allowSymlinkEscape: false,
    }));
  } finally {
    database.close();
    await rm(userHome, { recursive: true, force: true });
  }
});

test('resets only a built-in Target to freshly resolved adapter defaults', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-target-reset-'));
  const database = openFoundryDatabase(':memory:');

  try {
    const metadataRepository = new SkillMetadataRepository(database);
    const targetRepository = new SkillTargetRepository(database, { now: () => 20 });
    const definitions = await resolveBuiltInSkillTargets({
      userHomeDirectory: userHome,
      environment: {},
    });
    const [genericDefinition] = definitions;
    const [generic] = targetRepository.synchronizeBuiltInTargets([genericDefinition]);
    targetRepository.updateTargetPolicy({
      targetId: generic.id,
      enabled: false,
      maxScanDepth: 12,
      allowSymlinkEscape: true,
    });
    const installationRepository = new SkillInstallationRepository(database);
    const service = createService({
      database,
      userHome,
      metadataRepository,
      targetRepository,
      installationRepository,
      revealPath: () => {},
      resolveBuiltInTargets: () => Promise.resolve(definitions),
    });

    const reset = await service.resetBuiltInTargetPolicy(generic.id);

    assert.equal(reset.enabled, true);
    assert.equal(reset.maxScanDepth, genericDefinition.defaultMaxScanDepth);
    assert.equal(reset.allowSymlinkEscape, genericDefinition.defaultAllowSymlinkEscape);
    assert.equal(reset.policySource, 'adapter-default');

    const customPath = path.join(userHome, 'custom');
    const custom = targetRepository.createCustomTarget({
      displayName: 'Custom',
      configuredPath: customPath,
      resolvedPath: customPath,
      resolvedPathKey: customPath,
      isWritable: true,
      enabled: true,
      maxScanDepth: 4,
      allowSymlinkEscape: false,
    }).target;
    await assert.rejects(() => service.resetBuiltInTargetPolicy(custom.id));
  } finally {
    database.close();
    await rm(userHome, { recursive: true, force: true });
  }
});

interface CreateServiceInput {
  database: Database.Database;
  userHome: string;
  metadataRepository: SkillMetadataRepository;
  targetRepository: SkillTargetRepository;
  installationRepository: SkillInstallationRepository;
  revealPath: (targetPath: string) => void;
  openExternal?: (url: string) => void;
  createCandidateId?: () => string;
  resolveBuiltInTargets?: () => ReturnType<typeof resolveBuiltInSkillTargets>;
}

function createService(input: CreateServiceInput): SkillService {
  const paths = new SkillStorePaths(input.userHome);
  const storeCoordinator = new SkillStoreCoordinator(paths, input.metadataRepository);
  const sourceRepository = new SkillSourceRepository(input.database);
  const acquisition = new SkillRemoteAcquisitionCoordinator(paths);
  const gitSourceCoordinator = new SkillGitSourceCoordinator({
    acquisition,
    storeCoordinator,
    sourceRepository,
  });
  const httpClient = new SkillProviderHttpClient();
  const clawHubProvider = new SkillClawHubProvider({
    httpClient,
    acquisition,
    gitSourceCoordinator,
    storeCoordinator,
    sourceRepository,
  });
  const remoteDiscoveryCoordinator = new SkillRemoteDiscoveryCoordinator({
    clawHub: clawHubProvider,
    skillsSh: new SkillSkillsShProvider({ httpClient, gitSourceCoordinator }),
    gitSourceCoordinator,
    httpClient,
  });
  const discoveryCoordinator = new SkillDiscoveryCoordinator({
    userHomeDirectory: input.userHome,
    environment: {},
    targetRepository: input.targetRepository,
    installationRepository: input.installationRepository,
    storeCoordinator,
  });
  const operationQueue = new SkillOperationQueue();
  const trashCoordinator = new SkillTrashCoordinator({
    paths,
    metadataRepository: input.metadataRepository,
    installationRepository: input.installationRepository,
    operationQueue,
  });
  const watchCoordinator = new SkillWatchCoordinator({
    reconcileStore: () => storeCoordinator.reconcileStorePackages(),
    scan: () => discoveryCoordinator.scan(),
    resolveWatchPaths: () => Promise.resolve([paths.packages]),
    watchFactory: () => ({ close: async () => {} }),
    onChanged: () => {},
  });
  return new SkillService({
    paths,
    metadataRepository: input.metadataRepository,
    targetRepository: input.targetRepository,
    installationRepository: input.installationRepository,
    storeCoordinator,
    sourceRepository,
    gitSourceCoordinator,
    remoteDiscoveryCoordinator,
    updateCoordinator: new SkillUpdateCoordinator({
      metadataRepository: input.metadataRepository,
      sourceRepository,
      storeCoordinator,
      gitSourceCoordinator,
      clawHubProvider,
    }),
    discoveryCoordinator,
    fileCoordinator: new SkillFileCoordinator(paths, input.metadataRepository),
    watchCoordinator,
    targetMutationCoordinator: new SkillTargetMutationCoordinator({
      paths,
      metadataRepository: input.metadataRepository,
      targetRepository: input.targetRepository,
      installationRepository: input.installationRepository,
      storeCoordinator,
      operationQueue,
    }),
    trashCoordinator,
    resolveBuiltInTargets: input.resolveBuiltInTargets ?? (() => resolveBuiltInSkillTargets({
      userHomeDirectory: input.userHome,
      environment: {},
    })),
    revealPath: input.revealPath,
    openExternal: input.openExternal ?? (() => {}),
    createCandidateId: input.createCandidateId,
  });
}
