import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import {
  access,
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type {
  SkillApiError,
  SkillDistributionPreflightResult,
  SkillDistributionTargetPreflight,
} from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type {
  SkillInstallationMetadata,
  SkillInstallationRepository,
} from './skill-installation-repository';
import type {
  SkillPackageMetadata,
  SkillRevisionMetadata,
  SkillMetadataRepository,
} from './skill-metadata-repository';
import type { SkillOperationQueue } from './skill-operation-queue';
import { fingerprintSkillPackage } from './skill-package-fingerprint';
import { observeSkillPackage } from './skill-package-observer';
import type { SkillStoreCoordinator } from './skill-store-coordinator';
import type { SkillStorePaths } from './skill-store-paths';
import {
  normalizeResolvedPathKey,
  resolvePhysicalPath,
} from './skill-target-adapters';
import type {
  SkillTargetMetadata,
  SkillTargetRepository,
} from './skill-target-repository';
import {
  normalizeSkillDistributionName,
  parseSkillContentFingerprint,
  parseSkillDistributionInput,
  parseSkillDistributionName,
  parseSkillDistributionRecordId,
  parseSkillId,
  parseSkillInstallationCommandInput,
  parseSkillInstallationId,
  parseSkillRelativePath,
  parseSkillRevisionId,
  parseSkillTargetId,
} from './skill-validation';

type TargetMutationOperation = 'distribution' | 'restore';

interface TargetReplaceOperationMarker {
  version: 1;
  kind: 'replace';
  phase: 'staging' | 'backup-ready' | 'target-ready' | 'metadata-committed';
  operationId: string;
  packageId: string;
  targetId: string;
  installationId: string;
  distributionRecordId: string;
  revisionId: string;
  fingerprint: string;
  distributionName: string;
  relativePath: string;
  operation: TargetMutationOperation;
  hadBackup: boolean;
  createdAt: number;
}

interface TargetUninstallOperationMarker {
  version: 1;
  kind: 'uninstall';
  phase: 'prepared' | 'backup-ready' | 'metadata-committed';
  operationId: string;
  packageId: string;
  targetId: string;
  installationId: string;
  relativePath: string;
  hadBackup: boolean;
  createdAt: number;
}

type TargetOperationMarker = TargetReplaceOperationMarker | TargetUninstallOperationMarker;

interface SkillTargetMutationCoordinatorOptions {
  paths: SkillStorePaths;
  metadataRepository: SkillMetadataRepository;
  targetRepository: SkillTargetRepository;
  installationRepository: SkillInstallationRepository;
  storeCoordinator: SkillStoreCoordinator;
  operationQueue: SkillOperationQueue;
  createId?: () => string;
  now?: () => number;
  copyPackage?: (source: string, destination: string) => Promise<void>;
  removePath?: (targetPath: string) => Promise<void>;
}

interface PreparedTarget {
  target: SkillTargetMetadata;
  rootPath: string;
  installation: SkillInstallationMetadata | null;
  distributionName: string;
  relativePath: string;
  finalPath: string;
}

export type SkillTargetMutationResult
  = | {
    targetId: string;
    ok: true;
    installationId: string;
    revisionId: string;
  }
  | {
    targetId: string;
    ok: false;
    error: SkillApiError;
  };

export interface SkillDistributionMutationResult {
  skillId: string;
  revisionId: string | null;
  targets: SkillTargetMutationResult[];
}

export interface SkillPromotionMutationResult {
  package: SkillPackageMetadata;
  revision: SkillRevisionMetadata;
  installationId: string;
}

export interface SkillImportInstallationMutationResult {
  package: SkillPackageMetadata;
  revision: SkillRevisionMetadata;
}

export class SkillTargetMutationCoordinator {
  private readonly copyPackage: (source: string, destination: string) => Promise<void>;
  private readonly createId: () => string;
  private readonly now: () => number;
  private readonly removePath: (targetPath: string) => Promise<void>;

  constructor(private readonly options: SkillTargetMutationCoordinatorOptions) {
    this.copyPackage = options.copyPackage ?? copyPackageTree;
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? Date.now;
    this.removePath = options.removePath ?? removeTree;
  }

  private async observeStorePackage(packageId: string): Promise<SkillPackageMetadata> {
    const observation = await observeSkillPackage(
      path.join(this.options.paths.packages, packageId),
      this.now(),
    );
    const skillPackage = this.options.metadataRepository.updateStoreObservation(
      packageId,
      observation,
    );
    if (observation.status !== 'available') {
      throw new SkillOperationError(
        'content-unavailable',
        'The Store Working Copy could not be read completely.',
      );
    }
    return skillPackage;
  }

  private async prepareTarget(
    skillPackage: SkillPackageMetadata,
    target: SkillTargetMetadata,
    seenPathKeys?: Set<string>,
  ): Promise<
    PreparedTarget | Extract<SkillDistributionTargetPreflight, { status: 'conflict' }>
  > {
    if (!target.enabled) {
      return conflict(target.id, 'target-disabled', 'The Distribution Target is disabled.');
    }
    let rootPath: string;
    try {
      rootPath = await resolvePhysicalPath(target.configuredPath);
    } catch {
      return conflict(
        target.id,
        'target-unavailable',
        'The Distribution Target path could not be resolved.',
      );
    }
    const pathKey = normalizeResolvedPathKey(rootPath);
    if (pathKey !== target.resolvedPathKey) {
      return conflict(
        target.id,
        'target-unavailable',
        'The Distribution Target now resolves to a different physical path.',
      );
    }
    if (seenPathKeys?.has(pathKey)) {
      return conflict(
        target.id,
        'duplicate-physical-target',
        'The same physical Distribution Target was selected more than once.',
      );
    }
    seenPathKeys?.add(pathKey);
    if (!(await canWriteDirectoryOrAncestor(rootPath))) {
      return conflict(
        target.id,
        'target-read-only',
        'The Distribution Target is not writable.',
      );
    }

    const distributionName = parseSkillDistributionName(skillPackage.distributionName);
    const namedInstallation = this.options.installationRepository
      .findActiveInstallationByDistributionName(target.id, distributionName);
    if (namedInstallation && namedInstallation.packageId !== skillPackage.id) {
      return conflict(
        target.id,
        'name-conflict',
        'Another Skill Installation uses this Distribution Name.',
      );
    }
    const packageInstallations = this.options.installationRepository
      .listActiveInstallations(target.id)
      .filter((installation) => installation.packageId === skillPackage.id);
    const installation = namedInstallation
      ?? (packageInstallations.length === 1 ? packageInstallations[0] : null);
    if (!installation && packageInstallations.length > 1) {
      return conflict(
        target.id,
        'name-conflict',
        'More than one installation of this Skill occupies the Distribution Target.',
      );
    }
    const relativePath = installation?.relativePath ?? distributionName;
    const finalPath = resolveContainedTargetPath(rootPath, relativePath);

    if (installation) {
      const targetObservation = await observeSkillPackage(finalPath, this.now());
      this.options.installationRepository.updateInstallationObservation(
        installation.id,
        targetObservation,
      );
      if (targetObservation.status === 'unreadable') {
        return conflict(
          target.id,
          'target-unreadable',
          'The existing Skill Installation could not be read completely.',
        );
      }
    } else {
      const occupiedEntry = await findNormalizedRootEntry(rootPath, distributionName);
      if (occupiedEntry !== null) {
        return conflict(
          target.id,
          'untracked-content',
          `Unmanaged content already occupies ${occupiedEntry}.`,
        );
      }
    }

    return {
      target,
      rootPath,
      installation,
      distributionName,
      relativePath,
      finalPath,
    };
  }

  private async preflightUnlocked(inputValue: unknown): Promise<SkillDistributionPreflightResult> {
    const input = parseSkillDistributionInput(inputValue);
    const skillPackage = await this.observeStorePackage(input.skillId);
    const seenPathKeys = new Set<string>();
    const targets: SkillDistributionTargetPreflight[] = [];
    for (const targetId of input.targetIds) {
      let prepared:
        | PreparedTarget
        | Extract<SkillDistributionTargetPreflight, { status: 'conflict' }>;
      try {
        const target = this.options.targetRepository.getTarget(targetId);
        prepared = await this.prepareTarget(skillPackage, target, seenPathKeys);
      } catch (error) {
        const operationError = toSkillOperationError(error);
        targets.push(conflict(
          targetId,
          'target-unavailable',
          operationError.message,
        ));
        continue;
      }
      if ('status' in prepared) {
        targets.push(prepared);
      } else {
        targets.push({
          targetId,
          status: 'ready',
          operation: prepared.installation ? 'replace' : 'install',
          installationId: prepared.installation?.id ?? null,
        });
      }
    }
    return {
      skillId: skillPackage.id,
      distributionName: skillPackage.distributionName,
      targets,
    };
  }

  private async replaceTarget(
    skillPackage: SkillPackageMetadata,
    revision: SkillRevisionMetadata,
    targetId: string,
    operation: TargetMutationOperation,
    expectedInstallationId?: string,
  ): Promise<SkillTargetMutationResult> {
    try {
      const target = this.options.targetRepository.getTarget(targetId);
      const prepared = await this.prepareTarget(skillPackage, target);
      if ('status' in prepared) {
        throw new SkillOperationError('conflict', prepared.message);
      }
      if (
        expectedInstallationId !== undefined
        && prepared.installation?.id !== expectedInstallationId
      ) {
        throw new SkillOperationError('conflict', 'The Skill Installation changed.');
      }
      const installationId = prepared.installation?.id
        ?? parseSkillInstallationId(this.createId());
      const distributionRecordId = parseSkillDistributionRecordId(this.createId());
      const operationId = parseSkillId(this.createId());
      const operationRoot = path.join(this.options.paths.targetOperations, operationId);
      const finalParent = path.dirname(prepared.finalPath);
      const stagedPath = path.join(finalParent, `.foundry-${operationId}-stage`);
      const backupPath = path.join(finalParent, `.foundry-${operationId}-backup`);
      const revisionPath = path.join(
        this.options.paths.revisions,
        skillPackage.id,
        revision.id,
      );
      const marker: TargetReplaceOperationMarker = {
        version: 1,
        kind: 'replace',
        phase: 'staging',
        operationId,
        packageId: skillPackage.id,
        targetId,
        installationId,
        distributionRecordId,
        revisionId: revision.id,
        fingerprint: revision.fingerprint,
        distributionName: prepared.distributionName,
        relativePath: prepared.relativePath,
        operation,
        hadBackup: false,
        createdAt: this.now(),
      };
      let isOperationOwned = false;
      let isTargetReady = false;
      let isMetadataCommitted = false;

      try {
        await mkdir(finalParent, { recursive: true });
        if (await pathEntryExists(stagedPath) || await pathEntryExists(backupPath)) {
          throw new SkillOperationError('conflict', 'A Target operation path is occupied.');
        }
        await mkdir(operationRoot, { mode: 0o700 });
        isOperationOwned = true;
        await writeTargetOperationMarker(operationRoot, marker);
        await this.copyPackage(revisionPath, stagedPath);
        await assertPackageFingerprint(stagedPath, revision.fingerprint);

        const currentStore = await this.observeStorePackage(skillPackage.id);
        if (
          currentStore.storeObservation.status !== 'available'
          || currentStore.storeObservation.fingerprint !== revision.fingerprint
        ) {
          throw new SkillOperationError(
            'conflict',
            'The Store Working Copy changed after distribution started.',
          );
        }
        const rechecked = await this.prepareTarget(currentStore, target);
        if (
          'status' in rechecked
          || rechecked.relativePath !== prepared.relativePath
          || rechecked.installation?.id !== prepared.installation?.id
        ) {
          throw new SkillOperationError('conflict', 'The Distribution Target changed.');
        }

        if (await pathEntryExists(prepared.finalPath)) {
          await rename(prepared.finalPath, backupPath);
          marker.hadBackup = true;
        }
        marker.phase = 'backup-ready';
        await writeTargetOperationMarker(operationRoot, marker);
        await rename(stagedPath, prepared.finalPath);
        isTargetReady = true;
        marker.phase = 'target-ready';
        await writeTargetOperationMarker(operationRoot, marker);
        await assertPackageFingerprint(prepared.finalPath, revision.fingerprint);

        this.options.installationRepository.recordDistribution({
          installationId,
          distributionRecordId,
          packageId: skillPackage.id,
          targetId,
          revisionId: revision.id,
          distributionName: prepared.distributionName,
          relativePath: prepared.relativePath,
          fingerprint: revision.fingerprint,
          operation,
          observedAt: this.now(),
        });
        isMetadataCommitted = true;
        marker.phase = 'metadata-committed';
        await ignoreFailure(() => writeTargetOperationMarker(operationRoot, marker));
        await ignoreFailure(() => this.removePath(backupPath));
        await ignoreFailure(() => this.removePath(operationRoot));
        return { targetId, ok: true, installationId, revisionId: revision.id };
      } catch (error) {
        if (!isMetadataCommitted) {
          const isRestored = await compensateTargetReplacement({
            finalPath: prepared.finalPath,
            stagedPath,
            backupPath,
            targetReady: isTargetReady,
            hadBackup: marker.hadBackup,
            removePath: this.removePath,
          });
          if (isOperationOwned && isRestored) {
            await ignoreFailure(() => this.removePath(operationRoot));
          }
        }
        throw error;
      }
    } catch (error) {
      return { targetId, ok: false, error: toSkillOperationError(error).toApiError() };
    }
  }

  private async distributeUnlocked(inputValue: unknown): Promise<SkillDistributionMutationResult> {
    const input = parseSkillDistributionInput(inputValue);
    const preflight = await this.preflightUnlocked(input);
    const readyTargetIds = preflight.targets
      .filter((target): target is Extract<SkillDistributionTargetPreflight, { status: 'ready' }> => (
        target.status === 'ready'
      ))
      .map((target) => target.targetId);
    if (readyTargetIds.length === 0) {
      return {
        skillId: input.skillId,
        revisionId: null,
        targets: preflight.targets.map((target) => ({
          targetId: target.targetId,
          ok: false,
          error: target.status === 'conflict'
            ? { code: 'conflict', message: target.message }
            : { code: 'internal', message: 'Distribution could not start.' },
        })),
      };
    }
    const snapshot = await this.options.storeCoordinator.snapshotStorePackage(
      input.skillId,
      'distribution',
    );
    const skillPackage = this.options.metadataRepository.getActivePackage(input.skillId);
    const results: SkillTargetMutationResult[] = [];
    for (const target of preflight.targets) {
      if (target.status === 'conflict') {
        results.push({
          targetId: target.targetId,
          ok: false,
          error: { code: 'conflict', message: target.message },
        });
      } else {
        results.push(await this.replaceTarget(
          skillPackage,
          snapshot.revision,
          target.targetId,
          'distribution',
          target.installationId ?? undefined,
        ));
      }
    }
    return {
      skillId: input.skillId,
      revisionId: snapshot.revision.id,
      targets: results,
    };
  }

  private async restoreUnlocked(inputValue: unknown): Promise<SkillTargetMutationResult> {
    const input = parseSkillInstallationCommandInput(inputValue);
    const installation = this.options.installationRepository.getActiveInstallation(
      input.installationId,
    );
    await this.observeStorePackage(installation.packageId);
    const snapshot = await this.options.storeCoordinator.snapshotStorePackage(
      installation.packageId,
      'distribution',
    );
    const skillPackage = this.options.metadataRepository.getActivePackage(
      installation.packageId,
    );
    return this.replaceTarget(
      skillPackage,
      snapshot.revision,
      installation.targetId,
      'restore',
      installation.id,
    );
  }

  private async resolveReadableInstallation(
    installationIdValue: unknown,
  ): Promise<{ installation: SkillInstallationMetadata; contentPath: string }> {
    const installation = this.options.installationRepository.getActiveInstallation(
      installationIdValue,
    );
    const target = this.options.targetRepository.getTarget(installation.targetId);
    const rootPath = await resolvePhysicalPath(target.configuredPath);
    if (normalizeResolvedPathKey(rootPath) !== target.resolvedPathKey) {
      throw new SkillOperationError('content-unavailable', 'The Distribution Target changed.');
    }
    const contentPath = resolveContainedTargetPath(rootPath, installation.relativePath);
    const observation = await observeSkillPackage(contentPath, this.now());
    this.options.installationRepository.updateInstallationObservation(
      installation.id,
      observation,
    );
    if (observation.status !== 'available') {
      throw new SkillOperationError(
        'content-unavailable',
        'The Skill Installation could not be read completely.',
      );
    }
    return { installation, contentPath };
  }

  private async promoteUnlocked(inputValue: unknown): Promise<SkillPromotionMutationResult> {
    const input = parseSkillInstallationCommandInput(inputValue);
    const { installation, contentPath } = await this.resolveReadableInstallation(
      input.installationId,
    );
    const promoted = await this.options.storeCoordinator.promoteStorePackage(
      installation.packageId,
      contentPath,
    );
    return {
      package: promoted.package,
      revision: promoted.revision,
      installationId: installation.id,
    };
  }

  private async importAsNewUnlocked(
    inputValue: unknown,
  ): Promise<SkillImportInstallationMutationResult> {
    const input = parseSkillInstallationCommandInput(inputValue);
    const { contentPath } = await this.resolveReadableInstallation(input.installationId);
    const imported = await this.options.storeCoordinator.importPackageAsNew(contentPath);
    if (imported.reused) {
      throw new SkillOperationError('internal', 'A new Skill identity could not be created.');
    }
    return { package: imported.package, revision: imported.revision };
  }

  private async uninstallUnlocked(inputValue: unknown): Promise<null> {
    const input = parseSkillInstallationCommandInput(inputValue);
    const installation = this.options.installationRepository.getActiveInstallation(
      input.installationId,
    );
    const target = this.options.targetRepository.getTarget(installation.targetId);
    const rootPath = await resolvePhysicalPath(target.configuredPath);
    if (normalizeResolvedPathKey(rootPath) !== target.resolvedPathKey) {
      throw new SkillOperationError('content-unavailable', 'The Distribution Target changed.');
    }
    const finalPath = resolveContainedTargetPath(rootPath, installation.relativePath);
    const observation = await observeSkillPackage(finalPath, this.now());
    this.options.installationRepository.updateInstallationObservation(
      installation.id,
      observation,
    );
    if (observation.status === 'unreadable') {
      throw new SkillOperationError(
        'content-unavailable',
        'The Skill Installation could not be read completely.',
      );
    }
    const operationId = parseSkillId(this.createId());
    const operationRoot = path.join(this.options.paths.targetOperations, operationId);
    const backupPath = path.join(path.dirname(finalPath), `.foundry-${operationId}-backup`);
    const marker: TargetUninstallOperationMarker = {
      version: 1,
      kind: 'uninstall',
      phase: 'prepared',
      operationId,
      packageId: installation.packageId,
      targetId: installation.targetId,
      installationId: installation.id,
      relativePath: installation.relativePath,
      hadBackup: false,
      createdAt: this.now(),
    };
    let isOperationOwned = false;
    let isMetadataCommitted = false;
    try {
      await mkdir(operationRoot, { mode: 0o700 });
      isOperationOwned = true;
      await writeTargetOperationMarker(operationRoot, marker);
      if (observation.status === 'available') {
        if (await pathEntryExists(backupPath)) {
          throw new SkillOperationError('conflict', 'A Target operation path is occupied.');
        }
        await rename(finalPath, backupPath);
        marker.hadBackup = true;
      }
      marker.phase = 'backup-ready';
      await writeTargetOperationMarker(operationRoot, marker);
      this.options.installationRepository.markInstallationUninstalled(
        installation.id,
        this.now(),
      );
      isMetadataCommitted = true;
      marker.phase = 'metadata-committed';
      await ignoreFailure(() => writeTargetOperationMarker(operationRoot, marker));
      await ignoreFailure(() => this.removePath(backupPath));
      await ignoreFailure(() => this.removePath(operationRoot));
      return null;
    } catch (error) {
      if (!isMetadataCommitted && marker.hadBackup) {
        const isRestored = await attemptOperation(() => rename(backupPath, finalPath));
        if (isOperationOwned && isRestored) {
          await ignoreFailure(() => this.removePath(operationRoot));
        }
      } else if (!isMetadataCommitted && isOperationOwned) {
        await ignoreFailure(() => this.removePath(operationRoot));
      }
      throw toSkillOperationError(error);
    }
  }

  private async recoverInterruptedOperations(): Promise<void> {
    const entries = await readdir(this.options.paths.targetOperations, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const operationRoot = path.join(this.options.paths.targetOperations, entry.name);
      if (!entry.isDirectory()) {
        throw targetRecoveryError();
      }
      try {
        const markerText = await readFile(path.join(operationRoot, 'operation.json'), 'utf8');
        const marker = parseTargetOperationMarker(JSON.parse(markerText));
        if (marker.operationId !== entry.name) {
          throw targetRecoveryError();
        }
        if (marker.kind === 'replace') {
          await this.recoverReplaceOperation(operationRoot, marker);
        } else {
          await this.recoverUninstallOperation(operationRoot, marker);
        }
      } catch (error) {
        if (hasFilesystemCode(error, 'ENOENT')) {
          await this.removePath(operationRoot);
          continue;
        }
        throw error instanceof SkillOperationError ? error : targetRecoveryError();
      }
    }
  }

  private async resolveMarkerTargetPath(
    targetId: string,
    relativePath: string,
  ): Promise<string> {
    const target = this.options.targetRepository.getTarget(targetId);
    const rootPath = await resolvePhysicalPath(target.configuredPath);
    if (normalizeResolvedPathKey(rootPath) !== target.resolvedPathKey) {
      throw targetRecoveryError();
    }
    return resolveContainedTargetPath(rootPath, relativePath);
  }

  private async recoverReplaceOperation(
    operationRoot: string,
    marker: TargetReplaceOperationMarker,
  ): Promise<void> {
    const finalPath = await this.resolveMarkerTargetPath(
      marker.targetId,
      marker.relativePath,
    );
    const parentPath = path.dirname(finalPath);
    const stagedPath = path.join(parentPath, `.foundry-${marker.operationId}-stage`);
    const backupPath = path.join(parentPath, `.foundry-${marker.operationId}-backup`);
    const record = this.options.installationRepository.findDistributionRecordById(
      marker.distributionRecordId,
    );
    if (record) {
      if (
        record.installationId !== marker.installationId
        || record.packageId !== marker.packageId
        || record.revisionId !== marker.revisionId
        || record.fingerprint !== marker.fingerprint
      ) {
        throw targetRecoveryError();
      }
      const observation = await observeSkillPackage(finalPath);
      if (
        observation.status !== 'available'
        || observation.fingerprint !== marker.fingerprint
      ) {
        throw targetRecoveryError();
      }
      await ignoreFailure(() => this.removePath(stagedPath));
      await ignoreFailure(() => this.removePath(backupPath));
      await this.removePath(operationRoot);
      return;
    }
    if (marker.phase === 'metadata-committed') {
      throw targetRecoveryError();
    }
    const hasBackup = await pathEntryExists(backupPath);
    const finalObservation = await observeSkillPackage(finalPath);
    if (hasBackup) {
      if (finalObservation.status === 'available') {
        await this.removePath(finalPath);
      } else if (finalObservation.status === 'unreadable') {
        throw targetRecoveryError();
      }
      await rename(backupPath, finalPath);
    } else if (
      !marker.hadBackup
      && finalObservation.status === 'available'
      && finalObservation.fingerprint === marker.fingerprint
    ) {
      await this.removePath(finalPath);
    } else if (marker.hadBackup) {
      throw targetRecoveryError();
    }
    await ignoreFailure(() => this.removePath(stagedPath));
    await this.removePath(operationRoot);
  }

  private async recoverUninstallOperation(
    operationRoot: string,
    marker: TargetUninstallOperationMarker,
  ): Promise<void> {
    const finalPath = await this.resolveMarkerTargetPath(
      marker.targetId,
      marker.relativePath,
    );
    const backupPath = path.join(
      path.dirname(finalPath),
      `.foundry-${marker.operationId}-backup`,
    );
    if (!this.options.installationRepository.isInstallationActive(marker.installationId)) {
      await ignoreFailure(() => this.removePath(backupPath));
      await this.removePath(operationRoot);
      return;
    }
    if (marker.phase === 'metadata-committed') {
      throw targetRecoveryError();
    }
    if (marker.hadBackup) {
      if (!(await pathEntryExists(backupPath)) || await pathEntryExists(finalPath)) {
        throw targetRecoveryError();
      }
      await rename(backupPath, finalPath);
    }
    await this.removePath(operationRoot);
  }

  initialize(): Promise<void> {
    return this.options.operationQueue.run(() => this.recoverInterruptedOperations());
  }

  preflightDistribution(inputValue: unknown): Promise<SkillDistributionPreflightResult> {
    return this.options.operationQueue.run(() => this.preflightUnlocked(inputValue));
  }

  distribute(inputValue: unknown): Promise<SkillDistributionMutationResult> {
    return this.options.operationQueue.run(() => this.distributeUnlocked(inputValue));
  }

  restoreInstallation(inputValue: unknown): Promise<SkillTargetMutationResult> {
    return this.options.operationQueue.run(() => this.restoreUnlocked(inputValue));
  }

  promoteInstallation(inputValue: unknown): Promise<SkillPromotionMutationResult> {
    return this.options.operationQueue.run(() => this.promoteUnlocked(inputValue));
  }

  importInstallationAsNew(
    inputValue: unknown,
  ): Promise<SkillImportInstallationMutationResult> {
    return this.options.operationQueue.run(() => this.importAsNewUnlocked(inputValue));
  }

  uninstall(inputValue: unknown): Promise<null> {
    return this.options.operationQueue.run(() => this.uninstallUnlocked(inputValue));
  }
}

function conflict(
  targetId: string,
  code: Extract<SkillDistributionTargetPreflight, { status: 'conflict' }>['code'],
  message: string,
): Extract<SkillDistributionTargetPreflight, { status: 'conflict' }> {
  return { targetId, status: 'conflict', code, message };
}

function resolveContainedTargetPath(rootPath: string, relativePathValue: unknown): string {
  const relativePath = parseSkillRelativePath(relativePathValue);
  const resolvedRoot = path.resolve(rootPath);
  const finalPath = path.resolve(resolvedRoot, ...relativePath.split('/'));
  const containment = path.relative(resolvedRoot, finalPath);
  if (
    containment === '..'
    || containment.startsWith(`..${path.sep}`)
    || path.isAbsolute(containment)
  ) {
    throw new SkillOperationError('invalid-input', 'Skill Installation path escaped its Target.');
  }
  return finalPath;
}

async function canWriteDirectoryOrAncestor(targetPath: string): Promise<boolean> {
  let candidate = targetPath;
  for (;;) {
    try {
      const candidateStats = await stat(candidate);
      if (!candidateStats.isDirectory()) {
        return false;
      }
      await access(candidate, constants.W_OK);
      return true;
    } catch (error) {
      if (!hasFilesystemCode(error, 'ENOENT') && !hasFilesystemCode(error, 'ENOTDIR')) {
        return false;
      }
      const parent = path.dirname(candidate);
      if (parent === candidate) {
        return false;
      }
      candidate = parent;
    }
  }
}

async function findNormalizedRootEntry(
  rootPath: string,
  distributionName: string,
): Promise<string | null> {
  try {
    const entries = await readdir(rootPath);
    const normalizedName = normalizeSkillDistributionName(distributionName);
    return entries.find((entry) => (
      normalizeSkillDistributionName(entry) === normalizedName
    )) ?? null;
  } catch (error) {
    if (hasFilesystemCode(error, 'ENOENT') || hasFilesystemCode(error, 'ENOTDIR')) {
      return null;
    }
    throw error;
  }
}

async function copyPackageTree(source: string, destination: string): Promise<void> {
  await cp(source, destination, {
    recursive: true,
    dereference: false,
    errorOnExist: true,
    force: false,
    verbatimSymlinks: true,
  });
}

async function assertPackageFingerprint(packageRoot: string, expected: string): Promise<void> {
  if (await fingerprintSkillPackage(packageRoot) !== expected) {
    throw new SkillOperationError(
      'content-unavailable',
      'The Skill Package changed while it was being copied.',
    );
  }
}

async function compensateTargetReplacement(input: {
  finalPath: string;
  stagedPath: string;
  backupPath: string;
  targetReady: boolean;
  hadBackup: boolean;
  removePath: (targetPath: string) => Promise<void>;
}): Promise<boolean> {
  await ignoreFailure(() => input.removePath(input.stagedPath));
  if (input.targetReady && !(await attemptOperation(() => input.removePath(input.finalPath)))) {
    return false;
  }
  if (input.hadBackup) {
    return attemptOperation(() => rename(input.backupPath, input.finalPath));
  }
  return true;
}

async function pathEntryExists(targetPath: string): Promise<boolean> {
  try {
    await lstat(targetPath);
    return true;
  } catch (error) {
    if (hasFilesystemCode(error, 'ENOENT')) {
      return false;
    }
    throw error;
  }
}

async function removeTree(targetPath: string): Promise<void> {
  await rm(targetPath, { recursive: true, force: true });
}

async function attemptOperation(operation: () => Promise<void>): Promise<boolean> {
  try {
    await operation();
    return true;
  } catch {
    return false;
  }
}

async function ignoreFailure(operation: () => Promise<void>): Promise<void> {
  await attemptOperation(operation);
}

function hasFilesystemCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
}

function targetRecoveryError(): SkillOperationError {
  return new SkillOperationError(
    'filesystem-unavailable',
    'A Distribution Target contains an interrupted operation that requires attention.',
  );
}

async function writeTargetOperationMarker(
  operationRoot: string,
  marker: TargetOperationMarker,
): Promise<void> {
  const markerPath = path.join(operationRoot, 'operation.json');
  const temporaryPath = path.join(operationRoot, 'operation.json.tmp');
  await writeFile(temporaryPath, `${JSON.stringify(marker)}\n`, { mode: 0o600 });
  await rename(temporaryPath, markerPath);
}

function parseTargetOperationMarker(value: unknown): TargetOperationMarker {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw targetRecoveryError();
  }
  const marker = value as Record<string, unknown>;
  try {
    if (
      marker.version !== 1
      || typeof marker.createdAt !== 'number'
      || !Number.isSafeInteger(marker.createdAt)
      || marker.createdAt < 0
      || typeof marker.hadBackup !== 'boolean'
    ) {
      throw new Error('Invalid Target operation marker.');
    }
    const common = {
      version: 1 as const,
      operationId: parseSkillId(marker.operationId),
      packageId: parseSkillId(marker.packageId),
      targetId: parseSkillTargetId(marker.targetId),
      installationId: parseSkillInstallationId(marker.installationId),
      relativePath: parseSkillRelativePath(marker.relativePath),
      hadBackup: marker.hadBackup,
      createdAt: marker.createdAt,
    };
    if (marker.kind === 'replace') {
      const phases: Array<TargetReplaceOperationMarker['phase']> = [
        'staging',
        'backup-ready',
        'target-ready',
        'metadata-committed',
      ];
      if (
        !phases.includes(marker.phase as TargetReplaceOperationMarker['phase'])
        || (marker.operation !== 'distribution' && marker.operation !== 'restore')
      ) {
        throw new Error('Invalid Target replacement marker.');
      }
      return {
        ...common,
        kind: 'replace',
        phase: marker.phase as TargetReplaceOperationMarker['phase'],
        distributionRecordId: parseSkillDistributionRecordId(
          marker.distributionRecordId,
        ),
        revisionId: parseSkillRevisionId(marker.revisionId),
        fingerprint: parseSkillContentFingerprint(marker.fingerprint),
        distributionName: parseSkillDistributionName(marker.distributionName),
        operation: marker.operation,
      };
    }
    if (marker.kind === 'uninstall') {
      const phases: Array<TargetUninstallOperationMarker['phase']> = [
        'prepared',
        'backup-ready',
        'metadata-committed',
      ];
      if (!phases.includes(marker.phase as TargetUninstallOperationMarker['phase'])) {
        throw new Error('Invalid Target uninstall marker.');
      }
      return {
        ...common,
        kind: 'uninstall',
        phase: marker.phase as TargetUninstallOperationMarker['phase'],
      };
    }
    throw new Error('Invalid Target operation kind.');
  } catch {
    throw targetRecoveryError();
  }
}
