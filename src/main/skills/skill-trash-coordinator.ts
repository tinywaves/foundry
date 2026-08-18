import { randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type {
  SkillApiError,
  SkillContentObservation,
} from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type { SkillInstallationRepository } from './skill-installation-repository';
import type {
  SkillPackageMetadata,
  SkillMetadataRepository,
  SkillTrashPackageMetadata,
} from './skill-metadata-repository';
import type { SkillOperationQueue } from './skill-operation-queue';
import { observeSkillPackage } from './skill-package-observer';
import type { SkillStorePaths } from './skill-store-paths';
import { parseSkillId } from './skill-validation';

type TrashOperationMarker
  = | {
    version: 1;
    kind: 'delete';
    phase: 'prepared' | 'content-staged' | 'trash-ready' | 'metadata-committed';
    operationId: string;
    packageId: string;
    createdAt: number;
  }
  | {
    version: 1;
    kind: 'restore';
    phase: 'prepared' | 'content-staged' | 'active-ready' | 'metadata-committed';
    operationId: string;
    packageId: string;
    createdAt: number;
  }
  | {
    version: 1;
    kind: 'remove';
    phase: 'prepared' | 'content-staged' | 'metadata-committed';
    operationId: string;
    packageId: string;
    hadContent: boolean;
    createdAt: number;
  };

interface SkillTrashCoordinatorOptions {
  paths: SkillStorePaths;
  metadataRepository: SkillMetadataRepository;
  installationRepository: SkillInstallationRepository;
  operationQueue: SkillOperationQueue;
  createId?: () => string;
  now?: () => number;
  removePath?: (targetPath: string) => Promise<void>;
}

export interface ObservedSkillTrashPackage {
  package: SkillTrashPackageMetadata;
  observation: SkillContentObservation;
}

export interface EmptySkillTrashResult {
  removedIds: string[];
  failures: Array<{ skillId: string; error: SkillApiError }>;
}

export class SkillTrashCoordinator {
  private readonly createId: () => string;
  private readonly now: () => number;
  private readonly removePath: (targetPath: string) => Promise<void>;

  constructor(private readonly options: SkillTrashCoordinatorOptions) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? Date.now;
    this.removePath = options.removePath ?? removeTree;
  }

  private getPaths(packageId: string, operationId: string) {
    const operationRoot = path.join(this.options.paths.trashOperations, operationId);
    const stagedContent = path.join(operationRoot, 'content');
    return {
      operationRoot,
      stagedContent,
      stagedPackage: path.join(stagedContent, 'package'),
      stagedRevisions: path.join(stagedContent, 'revisions'),
      activePackage: path.join(this.options.paths.packages, packageId),
      activeRevisions: path.join(this.options.paths.revisions, packageId),
      trashRoot: path.join(this.options.paths.trash, packageId),
    };
  }

  private async observeTrashPackage(
    skillPackage: SkillTrashPackageMetadata,
  ): Promise<ObservedSkillTrashPackage> {
    const observedAt = this.now();
    const paths = this.getPaths(skillPackage.id, skillPackage.id);
    const packageObservation = await observeSkillPackage(
      path.join(paths.trashRoot, 'package'),
      observedAt,
    );
    if (packageObservation.status !== 'available') {
      return { package: skillPackage, observation: packageObservation };
    }
    try {
      await assertOwnedDirectory(path.join(paths.trashRoot, 'revisions'));
      return { package: skillPackage, observation: packageObservation };
    } catch (error) {
      return {
        package: skillPackage,
        observation: {
          status: hasFilesystemCode(error, 'ENOENT') ? 'missing' : 'unreadable',
          observedAt,
        },
      };
    }
  }

  private async movePackageToTrashUnlocked(
    packageIdValue: unknown,
  ): Promise<ObservedSkillTrashPackage> {
    const packageId = parseSkillId(packageIdValue);
    this.options.metadataRepository.getActivePackage(packageId);
    if (this.options.installationRepository.countActiveInstallationsForPackage(packageId) > 0) {
      throw new SkillOperationError(
        'conflict',
        'Uninstall this Skill from every Distribution Target before moving it to Trash.',
      );
    }
    const observedAt = this.now();
    const observation = await observeSkillPackage(
      path.join(this.options.paths.packages, packageId),
      observedAt,
    );
    if (observation.status !== 'available') {
      throw new SkillOperationError(
        'content-unavailable',
        'The Store Working Copy must be readable before it can be moved to Trash.',
      );
    }
    const operationId = parseSkillId(this.createId());
    const paths = this.getPaths(packageId, operationId);
    await assertOwnedDirectory(paths.activeRevisions);
    if (await pathEntryExists(paths.trashRoot)) {
      throw new SkillOperationError('conflict', 'Foundry Trash already contains this Skill ID.');
    }
    const marker: Extract<TrashOperationMarker, { kind: 'delete' }> = {
      version: 1,
      kind: 'delete',
      phase: 'prepared',
      operationId,
      packageId,
      createdAt: observedAt,
    };
    let isMetadataCommitted = false;
    try {
      await mkdir(paths.operationRoot, { mode: 0o700 });
      await mkdir(paths.stagedContent, { mode: 0o700 });
      await writeOperationMarker(paths.operationRoot, marker);
      await rename(paths.activePackage, paths.stagedPackage);
      await rename(paths.activeRevisions, paths.stagedRevisions);
      marker.phase = 'content-staged';
      await writeOperationMarker(paths.operationRoot, marker);
      await rename(paths.stagedContent, paths.trashRoot);
      marker.phase = 'trash-ready';
      await writeOperationMarker(paths.operationRoot, marker);
      const trashed = this.options.metadataRepository.markPackageTrashed(
        packageId,
        observedAt,
      );
      isMetadataCommitted = true;
      marker.phase = 'metadata-committed';
      await ignoreFailure(() => writeOperationMarker(paths.operationRoot, marker));
      await ignoreFailure(() => this.removePath(paths.operationRoot));
      return { package: trashed, observation };
    } catch (error) {
      if (!isMetadataCommitted) {
        const isRestored = await this.compensateDelete(paths);
        if (isRestored) {
          await ignoreFailure(() => this.removePath(paths.operationRoot));
        }
      }
      throw toSkillOperationError(error);
    }
  }

  private async restoreTrashedPackageUnlocked(
    packageIdValue: unknown,
  ): Promise<SkillPackageMetadata> {
    const packageId = parseSkillId(packageIdValue);
    const trashed = this.options.metadataRepository.getTrashedPackage(packageId);
    const trashObservation = await this.observeTrashPackage(trashed);
    if (trashObservation.observation.status !== 'available') {
      throw new SkillOperationError(
        'content-unavailable',
        'The complete Trash content is required before this Skill can be restored.',
      );
    }
    const operationId = parseSkillId(this.createId());
    const paths = this.getPaths(packageId, operationId);
    if (await pathEntryExists(paths.activePackage) || await pathEntryExists(paths.activeRevisions)) {
      throw new SkillOperationError(
        'conflict',
        'The canonical Store paths for this Skill ID are occupied.',
      );
    }
    const marker: Extract<TrashOperationMarker, { kind: 'restore' }> = {
      version: 1,
      kind: 'restore',
      phase: 'prepared',
      operationId,
      packageId,
      createdAt: this.now(),
    };
    let isMetadataCommitted = false;
    try {
      await mkdir(paths.operationRoot, { mode: 0o700 });
      await writeOperationMarker(paths.operationRoot, marker);
      await rename(paths.trashRoot, paths.stagedContent);
      marker.phase = 'content-staged';
      await writeOperationMarker(paths.operationRoot, marker);
      await rename(paths.stagedPackage, paths.activePackage);
      await rename(paths.stagedRevisions, paths.activeRevisions);
      marker.phase = 'active-ready';
      await writeOperationMarker(paths.operationRoot, marker);
      const observation = await observeSkillPackage(paths.activePackage, this.now());
      if (observation.status !== 'available') {
        throw new SkillOperationError(
          'content-unavailable',
          'The restored Store Working Copy could not be verified.',
        );
      }
      const restored = this.options.metadataRepository.restoreTrashedPackage(
        packageId,
        observation,
        this.now(),
      );
      isMetadataCommitted = true;
      marker.phase = 'metadata-committed';
      await ignoreFailure(() => writeOperationMarker(paths.operationRoot, marker));
      await ignoreFailure(() => this.removePath(paths.operationRoot));
      return restored;
    } catch (error) {
      if (!isMetadataCommitted) {
        const isRestored = await this.compensateRestore(paths);
        if (isRestored) {
          await ignoreFailure(() => this.removePath(paths.operationRoot));
        }
      }
      throw toSkillOperationError(error);
    }
  }

  private async removeTrashedPackageUnlocked(packageIdValue: unknown): Promise<null> {
    const packageId = parseSkillId(packageIdValue);
    this.options.metadataRepository.getTrashedPackage(packageId);
    const operationId = parseSkillId(this.createId());
    const paths = this.getPaths(packageId, operationId);
    const hasContent = await pathEntryExists(paths.trashRoot);
    if (hasContent) {
      await assertOwnedDirectory(paths.trashRoot);
    }
    const marker: Extract<TrashOperationMarker, { kind: 'remove' }> = {
      version: 1,
      kind: 'remove',
      phase: 'prepared',
      operationId,
      packageId,
      hadContent: hasContent,
      createdAt: this.now(),
    };
    let isMetadataCommitted = false;
    try {
      await mkdir(paths.operationRoot, { mode: 0o700 });
      await writeOperationMarker(paths.operationRoot, marker);
      if (hasContent) {
        await rename(paths.trashRoot, paths.stagedContent);
      }
      marker.phase = 'content-staged';
      await writeOperationMarker(paths.operationRoot, marker);
      this.options.metadataRepository.markTrashedPackageRemoved(packageId, this.now());
      isMetadataCommitted = true;
      marker.phase = 'metadata-committed';
      await ignoreFailure(() => writeOperationMarker(paths.operationRoot, marker));
      await ignoreFailure(() => this.removePath(paths.operationRoot));
      return null;
    } catch (error) {
      if (!isMetadataCommitted) {
        const isRestored = await this.compensateRemove(paths, hasContent);
        if (isRestored) {
          await ignoreFailure(() => this.removePath(paths.operationRoot));
        }
      }
      throw toSkillOperationError(error);
    }
  }

  private async compensateDelete(paths: ReturnType<SkillTrashCoordinator['getPaths']>): Promise<boolean> {
    if (await pathEntryExists(paths.trashRoot)) {
      if (await pathEntryExists(paths.stagedContent)) {
        return false;
      }
      if (!(await attemptOperation(() => rename(paths.trashRoot, paths.stagedContent)))) {
        return false;
      }
    }
    if (
      await pathEntryExists(paths.stagedPackage)
      && (await pathEntryExists(paths.activePackage)
        || !(await attemptOperation(() => rename(paths.stagedPackage, paths.activePackage))))
    ) {
      return false;
    }
    if (
      await pathEntryExists(paths.stagedRevisions)
      && (await pathEntryExists(paths.activeRevisions)
        || !(await attemptOperation(() => rename(paths.stagedRevisions, paths.activeRevisions))))
    ) {
      return false;
    }
    return await isOwnedDirectory(paths.activePackage)
      && await isOwnedDirectory(paths.activeRevisions)
      && !(await pathEntryExists(paths.trashRoot))
      && !(await pathEntryExists(paths.stagedPackage))
      && !(await pathEntryExists(paths.stagedRevisions));
  }

  private async compensateRestore(paths: ReturnType<SkillTrashCoordinator['getPaths']>): Promise<boolean> {
    if (
      await pathEntryExists(paths.trashRoot)
      && (
        await pathEntryExists(paths.activePackage)
        || await pathEntryExists(paths.activeRevisions)
        || await pathEntryExists(paths.stagedContent)
      )
    ) {
      return false;
    }
    if (await pathEntryExists(paths.activePackage)) {
      await mkdir(paths.stagedContent, { recursive: true, mode: 0o700 });
      if (await pathEntryExists(paths.stagedPackage)
        || !(await attemptOperation(() => rename(paths.activePackage, paths.stagedPackage)))) {
        return false;
      }
    }
    if (await pathEntryExists(paths.activeRevisions)) {
      await mkdir(paths.stagedContent, { recursive: true, mode: 0o700 });
      if (await pathEntryExists(paths.stagedRevisions)
        || !(await attemptOperation(() => rename(paths.activeRevisions, paths.stagedRevisions)))) {
        return false;
      }
    }
    const isRestored = !(await pathEntryExists(paths.stagedContent))
      || (!(await pathEntryExists(paths.trashRoot))
        && await attemptOperation(() => rename(paths.stagedContent, paths.trashRoot)));
    return isRestored
      && await isCompleteTrashDirectory(paths.trashRoot)
      && !(await pathEntryExists(paths.activePackage))
      && !(await pathEntryExists(paths.activeRevisions));
  }

  private async compensateRemove(
    paths: ReturnType<SkillTrashCoordinator['getPaths']>,
    hasContent: boolean,
  ): Promise<boolean> {
    if (!hasContent) {
      return !(await pathEntryExists(paths.trashRoot))
        && !(await pathEntryExists(paths.stagedContent));
    }
    const isTrashPresent = await pathEntryExists(paths.trashRoot);
    const isStagedContentPresent = await pathEntryExists(paths.stagedContent);
    if (isTrashPresent) {
      return !isStagedContentPresent && await isOwnedDirectory(paths.trashRoot);
    }
    return isStagedContentPresent
      && await attemptOperation(() => rename(paths.stagedContent, paths.trashRoot))
      && await isOwnedDirectory(paths.trashRoot);
  }

  private async recoverInterruptedOperations(): Promise<void> {
    const entries = await readdir(this.options.paths.trashOperations, { withFileTypes: true });
    for (const entry of entries) {
      const operationRoot = path.join(this.options.paths.trashOperations, entry.name);
      if (!entry.isDirectory()) {
        throw recoveryError();
      }
      try {
        const markerText = await readFile(path.join(operationRoot, 'operation.json'), 'utf8');
        const marker = parseOperationMarker(JSON.parse(markerText));
        if (marker.operationId !== entry.name) {
          throw recoveryError();
        }
        const paths = this.getPaths(marker.packageId, marker.operationId);
        const isActive = this.options.metadataRepository.findActivePackageById(
          marker.packageId,
        ) !== null;
        const isTrashed = this.options.metadataRepository.findTrashedPackageById(
          marker.packageId,
        ) !== null;
        const isRemoved = this.options.metadataRepository.isPackageRemoved(marker.packageId);
        if (marker.kind === 'delete') {
          if (isTrashed) {
            if (
              !(await isCompleteTrashDirectory(paths.trashRoot))
              || await pathEntryExists(paths.activePackage)
              || await pathEntryExists(paths.activeRevisions)
              || await pathEntryExists(paths.stagedContent)
            ) {
              throw recoveryError();
            }
          } else if (!isActive || isRemoved || !(await this.compensateDelete(paths))) {
            throw recoveryError();
          }
        } else if (marker.kind === 'restore') {
          if (isActive) {
            if (
              !(await isOwnedDirectory(paths.activePackage))
              || !(await isOwnedDirectory(paths.activeRevisions))
              || await pathEntryExists(paths.trashRoot)
              || !(await isAbsentOrEmptyOwnedDirectory(paths.stagedContent))
            ) {
              throw recoveryError();
            }
          } else if (!isTrashed || isRemoved || !(await this.compensateRestore(paths))) {
            throw recoveryError();
          }
        } else if (isRemoved) {
          if (await pathEntryExists(paths.trashRoot)) {
            throw recoveryError();
          }
        } else if (!isTrashed || !(await this.compensateRemove(paths, marker.hadContent))) {
          throw recoveryError();
        }
        await this.removePath(operationRoot);
      } catch (error) {
        throw error instanceof SkillOperationError ? error : recoveryError();
      }
    }
  }

  initialize(): Promise<void> {
    return this.options.operationQueue.run(() => this.recoverInterruptedOperations());
  }

  movePackageToTrash(packageIdValue: unknown): Promise<ObservedSkillTrashPackage> {
    return this.options.operationQueue.run(() => this.movePackageToTrashUnlocked(packageIdValue));
  }

  listTrash(): Promise<ObservedSkillTrashPackage[]> {
    return this.options.operationQueue.run(() => Promise.all(
      this.options.metadataRepository.listTrashedPackages().map((skillPackage) => (
        this.observeTrashPackage(skillPackage)
      )),
    ));
  }

  restoreTrashedPackage(packageIdValue: unknown): Promise<SkillPackageMetadata> {
    return this.options.operationQueue.run(() => (
      this.restoreTrashedPackageUnlocked(packageIdValue)
    ));
  }

  removeTrashedPackage(packageIdValue: unknown): Promise<null> {
    return this.options.operationQueue.run(() => (
      this.removeTrashedPackageUnlocked(packageIdValue)
    ));
  }

  emptyTrash(): Promise<EmptySkillTrashResult> {
    return this.options.operationQueue.run(async () => {
      const removedIds: string[] = [];
      const failures: EmptySkillTrashResult['failures'] = [];
      for (const skillPackage of this.options.metadataRepository.listTrashedPackages(1000)) {
        try {
          await this.removeTrashedPackageUnlocked(skillPackage.id);
          removedIds.push(skillPackage.id);
        } catch (error) {
          failures.push({
            skillId: skillPackage.id,
            error: toSkillOperationError(error).toApiError(),
          });
        }
      }
      return { removedIds, failures };
    });
  }
}

async function assertOwnedDirectory(targetPath: string): Promise<void> {
  const stats = await lstat(targetPath);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new SkillOperationError(
      'filesystem-unavailable',
      'A Foundry-owned Skill path is not a regular directory.',
    );
  }
}

async function isOwnedDirectory(targetPath: string): Promise<boolean> {
  try {
    await assertOwnedDirectory(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function isCompleteTrashDirectory(targetPath: string): Promise<boolean> {
  return await isOwnedDirectory(targetPath)
    && await isOwnedDirectory(path.join(targetPath, 'package'))
    && await isOwnedDirectory(path.join(targetPath, 'revisions'));
}

async function isAbsentOrEmptyOwnedDirectory(targetPath: string): Promise<boolean> {
  try {
    await assertOwnedDirectory(targetPath);
    const entries = await readdir(targetPath);
    return entries.length === 0;
  } catch (error) {
    return hasFilesystemCode(error, 'ENOENT');
  }
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

function recoveryError(): SkillOperationError {
  return new SkillOperationError(
    'filesystem-unavailable',
    'Foundry Trash contains an interrupted operation that requires attention.',
  );
}

async function writeOperationMarker(
  operationRoot: string,
  marker: TrashOperationMarker,
): Promise<void> {
  const markerPath = path.join(operationRoot, 'operation.json');
  const temporaryPath = path.join(operationRoot, 'operation.json.tmp');
  await writeFile(temporaryPath, `${JSON.stringify(marker)}\n`, { mode: 0o600 });
  await rename(temporaryPath, markerPath);
}

function parseOperationMarker(value: unknown): TrashOperationMarker {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw recoveryError();
  }
  const marker = value as Record<string, unknown>;
  try {
    if (
      marker.version !== 1
      || typeof marker.createdAt !== 'number'
      || !Number.isSafeInteger(marker.createdAt)
      || marker.createdAt < 0
    ) {
      throw new Error('Invalid Trash operation marker.');
    }
    const common = {
      version: 1 as const,
      operationId: parseSkillId(marker.operationId),
      packageId: parseSkillId(marker.packageId),
      createdAt: marker.createdAt,
    };
    if (marker.kind === 'delete') {
      const phases: Array<Extract<TrashOperationMarker, { kind: 'delete' }>['phase']> = [
        'prepared',
        'content-staged',
        'trash-ready',
        'metadata-committed',
      ];
      if (!phases.includes(marker.phase as typeof phases[number])) {
        throw new Error('Invalid Trash deletion marker.');
      }
      return { ...common, kind: 'delete', phase: marker.phase as typeof phases[number] };
    }
    if (marker.kind === 'restore') {
      const phases: Array<Extract<TrashOperationMarker, { kind: 'restore' }>['phase']> = [
        'prepared',
        'content-staged',
        'active-ready',
        'metadata-committed',
      ];
      if (!phases.includes(marker.phase as typeof phases[number])) {
        throw new Error('Invalid Trash restoration marker.');
      }
      return { ...common, kind: 'restore', phase: marker.phase as typeof phases[number] };
    }
    if (marker.kind === 'remove') {
      const phases: Array<Extract<TrashOperationMarker, { kind: 'remove' }>['phase']> = [
        'prepared',
        'content-staged',
        'metadata-committed',
      ];
      if (
        !phases.includes(marker.phase as typeof phases[number])
        || typeof marker.hadContent !== 'boolean'
      ) {
        throw new Error('Invalid Trash removal marker.');
      }
      return {
        ...common,
        kind: 'remove',
        phase: marker.phase as typeof phases[number],
        hadContent: marker.hadContent,
      };
    }
    throw new Error('Invalid Trash operation kind.');
  } catch {
    throw recoveryError();
  }
}
