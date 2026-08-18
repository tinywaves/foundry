import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { constants } from 'node:fs';
import {
  cp,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { parseDocument } from 'yaml';
import type {
  SkillContentFingerprint,
  SkillRevisionReason,
} from '../../shared/skill-contract';
import { skillRevisionReasons } from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type {
  ImportedPackageMetadata,
  SkillPackageMetadata,
  SkillRevisionMetadata,
  SkillMetadataRepository,
} from './skill-metadata-repository';
import { fingerprintSkillPackage } from './skill-package-fingerprint';
import { isRecognizedSkillPackage, observeSkillPackage } from './skill-package-observer';
import type { SkillStorePaths } from './skill-store-paths';
import {
  parseSkillDistributionName,
  parseSkillContentFingerprint,
  parseSkillId,
  parseSkillRevisionId,
} from './skill-validation';

const MAX_MANIFEST_FRONTMATTER_BYTES = 256 * 1024;

interface ImportOperationMarker {
  version: 1;
  kind: 'import';
  phase: 'copying' | 'package-ready' | 'content-ready' | 'metadata-committed';
  operationId: string;
  packageId: string;
  revisionId: string;
  fingerprint: SkillContentFingerprint;
  distributionName: string;
  createdAt: number;
}

interface RevisionOperationMarker {
  version: 1;
  kind: 'revision';
  phase: 'copying' | 'content-ready' | 'metadata-committed';
  operationId: string;
  packageId: string;
  revisionId: string;
  fingerprint: SkillContentFingerprint;
  reason: SkillRevisionReason;
  createdAt: number;
}

interface PromotionOperationMarker {
  version: 1;
  kind: 'promotion';
  phase:
    | 'copying'
    | 'revision-ready'
    | 'backup-ready'
    | 'package-ready'
    | 'metadata-committed';
  operationId: string;
  packageId: string;
  revisionId: string;
  fingerprint: SkillContentFingerprint;
  createdAt: number;
  createRevision: boolean;
  hadPackageBackup: boolean;
}

type SkillStoreOperationMarker
  = ImportOperationMarker | RevisionOperationMarker | PromotionOperationMarker;

interface SkillStoreCoordinatorOptions {
  createId?: () => string;
  now?: () => number;
  copyPackage?: (source: string, destination: string) => Promise<void>;
  removePath?: (target: string) => Promise<void>;
}

export type SkillImportResult
  = | (ImportedPackageMetadata & { reused: false })
    | { package: SkillPackageMetadata; revision: null; reused: true };

export interface SkillRevisionSnapshotResult {
  revision: SkillRevisionMetadata;
  reused: boolean;
}

export interface SkillStorePromotionResult extends SkillRevisionSnapshotResult {
  package: SkillPackageMetadata;
}

export class SkillStoreCoordinator {
  private readonly createId: () => string;
  private readonly now: () => number;
  private readonly copyPackage: (source: string, destination: string) => Promise<void>;
  private readonly removePath: (target: string) => Promise<void>;
  private mutationTail: Promise<boolean> = Promise.resolve(true);

  constructor(
    private readonly paths: SkillStorePaths,
    private readonly repository: SkillMetadataRepository,
    options: SkillStoreCoordinatorOptions = {},
  ) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? Date.now;
    this.copyPackage = options.copyPackage ?? copyPackageTree;
    this.removePath = options.removePath ?? removeTree;
  }

  private async snapshotStorePackageUnlocked(
    packageIdValue: unknown,
    reasonValue: unknown,
  ): Promise<SkillRevisionSnapshotResult> {
    if (!skillRevisionReasons.includes(reasonValue as SkillRevisionReason)) {
      throw new SkillOperationError('invalid-input', 'Skill Revision reason is invalid.');
    }
    const packageId = parseSkillId(packageIdValue);
    const reason = reasonValue as SkillRevisionReason;
    this.repository.getActivePackage(packageId);
    const createdAt = this.now();
    const packagePath = path.join(this.paths.packages, packageId);
    const observation = await observeSkillPackage(packagePath, createdAt);
    this.repository.updateStoreObservation(packageId, observation);
    if (observation.status !== 'available') {
      throw new SkillOperationError(
        'content-unavailable',
        'The Store Working Copy could not be read completely.',
      );
    }

    const existing = this.repository.findRevisionByFingerprint(
      packageId,
      observation.fingerprint,
    );
    if (existing) {
      return { revision: existing, reused: true };
    }

    const revisionId = parseSkillRevisionId(this.createId());
    const operationId = parseSkillId(this.createId());
    const operationRoot = path.join(this.paths.operations, operationId);
    const stagedRevision = path.join(operationRoot, 'revision');
    const revisionRoot = path.join(this.paths.revisions, packageId);
    const revisionPath = path.join(revisionRoot, revisionId);
    const marker: RevisionOperationMarker = {
      version: 1,
      kind: 'revision',
      phase: 'copying',
      operationId,
      packageId,
      revisionId,
      fingerprint: observation.fingerprint,
      reason,
      createdAt,
    };
    let isOperationOwned = false;
    let isRevisionOwned = false;
    let isMetadataCommitted = false;

    try {
      await mkdir(operationRoot, { mode: 0o700 });
      isOperationOwned = true;
      await writeOperationMarker(operationRoot, marker);
      await this.copyPackage(packagePath, stagedRevision);
      await assertFingerprint(stagedRevision, observation.fingerprint);
      await mkdir(revisionRoot, { recursive: true, mode: 0o700 });
      await rename(stagedRevision, revisionPath);
      isRevisionOwned = true;
      marker.phase = 'content-ready';
      await writeOperationMarker(operationRoot, marker);

      const revision = this.repository.createRevision({
        id: revisionId,
        packageId,
        fingerprint: observation.fingerprint,
        reason,
        createdAt,
      });
      isMetadataCommitted = true;
      marker.phase = 'metadata-committed';
      await ignoreFailure(() => writeOperationMarker(operationRoot, marker));
      await ignoreFailure(() => this.removePath(operationRoot));
      return { revision, reused: false };
    } catch (error) {
      if (!isMetadataCommitted) {
        const isRevisionClean = !isRevisionOwned
          || await attemptOperation(() => this.removePath(revisionPath));
        if (
          isOperationOwned
          && isRevisionClean
        ) {
          await ignoreFailure(() => this.removePath(operationRoot));
        }
      }
      throw toSkillOperationError(error);
    }
  }

  private async importPackageUnlocked(
    sourceRoot: string,
    shouldReuseExisting: boolean,
  ): Promise<SkillImportResult> {
    if (!(await isRecognizedSkillPackage(sourceRoot))) {
      throw new SkillOperationError(
        'invalid-input',
        'The selected directory is not a recognized Skill Package.',
      );
    }

    const observedAt = this.now();
    const sourceObservation = await observeSkillPackage(sourceRoot, observedAt);
    if (sourceObservation.status !== 'available') {
      throw new SkillOperationError(
        'content-unavailable',
        'The Skill Package could not be read completely.',
      );
    }

    const existingPackage = shouldReuseExisting
      ? this.repository.findActivePackageByFingerprint(sourceObservation.fingerprint)
      : null;
    if (existingPackage) {
      const existingObservation = await observeSkillPackage(
        path.join(this.paths.packages, existingPackage.id),
        observedAt,
      );
      const refreshedPackage = this.repository.updateStoreObservation(
        existingPackage.id,
        existingObservation,
      );
      if (
        existingObservation.status === 'available'
        && existingObservation.fingerprint === sourceObservation.fingerprint
      ) {
        return { package: refreshedPackage, revision: null, reused: true };
      }
    }

    const packageId = parseSkillId(this.createId());
    const revisionId = parseSkillRevisionId(this.createId());
    const operationId = parseSkillId(this.createId());
    const distributionName = await deriveDistributionName(sourceRoot, packageId);
    const operationRoot = path.join(this.paths.operations, operationId);
    const stagedPackage = path.join(operationRoot, 'package');
    const stagedRevision = path.join(operationRoot, 'revision');
    const finalPackage = path.join(this.paths.packages, packageId);
    const finalRevisionRoot = path.join(this.paths.revisions, packageId);
    const finalRevision = path.join(finalRevisionRoot, revisionId);
    const marker: ImportOperationMarker = {
      version: 1,
      kind: 'import',
      phase: 'copying',
      operationId,
      packageId,
      revisionId,
      fingerprint: sourceObservation.fingerprint,
      distributionName,
      createdAt: observedAt,
    };
    let isMetadataCommitted = false;
    let isOperationOwned = false;
    let isPackageOwned = false;
    let isRevisionRootOwned = false;

    try {
      await mkdir(operationRoot, { mode: 0o700 });
      isOperationOwned = true;
      await writeOperationMarker(operationRoot, marker);

      await this.copyPackage(sourceRoot, stagedPackage);
      await assertFingerprint(stagedPackage, sourceObservation.fingerprint);
      await rename(stagedPackage, finalPackage);
      isPackageOwned = true;
      marker.phase = 'package-ready';
      await writeOperationMarker(operationRoot, marker);

      await mkdir(finalRevisionRoot, { mode: 0o700 });
      isRevisionRootOwned = true;
      await this.copyPackage(finalPackage, stagedRevision);
      await assertFingerprint(stagedRevision, sourceObservation.fingerprint);
      await rename(stagedRevision, finalRevision);
      marker.phase = 'content-ready';
      await writeOperationMarker(operationRoot, marker);

      const imported = this.repository.createImportedPackage({
        id: packageId,
        distributionName,
        fingerprint: sourceObservation.fingerprint,
        revisionId,
        createdAt: observedAt,
      });
      isMetadataCommitted = true;
      marker.phase = 'metadata-committed';
      await ignoreFailure(() => writeOperationMarker(operationRoot, marker));
      await ignoreFailure(() => this.removePath(operationRoot));
      return { ...imported, reused: false };
    } catch (error) {
      if (!isMetadataCommitted) {
        await compensateImport({
          finalPackage,
          finalRevisionRoot,
          operationRoot,
          packageOwned: isPackageOwned,
          revisionRootOwned: isRevisionRootOwned,
          operationOwned: isOperationOwned,
          removePath: this.removePath,
        });
      }
      throw toSkillOperationError(error);
    }
  }

  private async promoteStorePackageUnlocked(
    packageIdValue: unknown,
    sourceRoot: string,
    reasonValue: unknown,
  ): Promise<SkillStorePromotionResult> {
    if (!skillRevisionReasons.includes(reasonValue as SkillRevisionReason)) {
      throw new SkillOperationError('invalid-input', 'Skill Revision reason is invalid.');
    }
    const reason = reasonValue as SkillRevisionReason;
    const packageId = parseSkillId(packageIdValue);
    this.repository.getActivePackage(packageId);
    if (!(await isRecognizedSkillPackage(sourceRoot))) {
      throw new SkillOperationError(
        'content-unavailable',
        'The Skill Installation is not a recognized Skill Package.',
      );
    }
    const createdAt = this.now();
    const sourceObservation = await observeSkillPackage(sourceRoot, createdAt);
    if (sourceObservation.status !== 'available') {
      throw new SkillOperationError(
        'content-unavailable',
        'The Skill Installation could not be read completely.',
      );
    }

    const existingRevision = this.repository.findRevisionByFingerprint(
      packageId,
      sourceObservation.fingerprint,
    );
    const revisionId = existingRevision?.id ?? parseSkillRevisionId(this.createId());
    const operationId = parseSkillId(this.createId());
    const operationRoot = path.join(this.paths.operations, operationId);
    const stagedPackage = path.join(operationRoot, 'package');
    const stagedRevision = path.join(operationRoot, 'revision');
    const backupPackage = path.join(operationRoot, 'package-backup');
    const finalPackage = path.join(this.paths.packages, packageId);
    const revisionRoot = path.join(this.paths.revisions, packageId);
    const finalRevision = path.join(revisionRoot, revisionId);
    const marker: PromotionOperationMarker = {
      version: 1,
      kind: 'promotion',
      phase: 'copying',
      operationId,
      packageId,
      revisionId,
      fingerprint: sourceObservation.fingerprint,
      createdAt,
      createRevision: existingRevision === null,
      hadPackageBackup: false,
    };
    let isOperationOwned = false;
    let isRevisionOwned = false;
    let isPackageReady = false;
    let isMetadataCommitted = false;

    try {
      await mkdir(operationRoot, { mode: 0o700 });
      isOperationOwned = true;
      await writeOperationMarker(operationRoot, marker);
      await this.copyPackage(sourceRoot, stagedPackage);
      await assertFingerprint(stagedPackage, sourceObservation.fingerprint);

      if (!existingRevision) {
        await this.copyPackage(stagedPackage, stagedRevision);
        await assertFingerprint(stagedRevision, sourceObservation.fingerprint);
        await mkdir(revisionRoot, { recursive: true, mode: 0o700 });
        await rename(stagedRevision, finalRevision);
        isRevisionOwned = true;
      }
      marker.phase = 'revision-ready';
      await writeOperationMarker(operationRoot, marker);

      if (await pathEntryExists(finalPackage)) {
        await rename(finalPackage, backupPackage);
        marker.hadPackageBackup = true;
      }
      marker.phase = 'backup-ready';
      await writeOperationMarker(operationRoot, marker);
      await rename(stagedPackage, finalPackage);
      isPackageReady = true;
      marker.phase = 'package-ready';
      await writeOperationMarker(operationRoot, marker);

      const committed = this.repository.commitStorePromotion({
        packageId,
        observation: sourceObservation,
        revision: existingRevision ?? {
          id: revisionId,
          packageId,
          sequenceNumber: 0,
          fingerprint: sourceObservation.fingerprint,
          reason,
          createdAt,
        },
        createRevision: existingRevision === null,
      });
      isMetadataCommitted = true;
      marker.phase = 'metadata-committed';
      await ignoreFailure(() => writeOperationMarker(operationRoot, marker));
      await ignoreFailure(() => this.removePath(operationRoot));
      return {
        package: committed.package,
        revision: committed.revision,
        reused: existingRevision !== null,
      };
    } catch (error) {
      if (!isMetadataCommitted) {
        const isPackageRestored = await compensateStorePromotion({
          finalPackage,
          backupPackage,
          packageReady: isPackageReady,
          hadPackageBackup: marker.hadPackageBackup,
          removePath: this.removePath,
        });
        const isRevisionClean = !isRevisionOwned
          || await attemptOperation(() => this.removePath(finalRevision));
        if (isOperationOwned && isPackageRestored && isRevisionClean) {
          await ignoreFailure(() => this.removePath(operationRoot));
        }
      }
      throw toSkillOperationError(error);
    }
  }

  private async runSerializedMutation<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.mutationTail;
    const gate = Promise.withResolvers<boolean>();
    this.mutationTail = gate.promise;
    await previous;
    try {
      return await operation();
    } finally {
      gate.resolve(true);
    }
  }

  private async reconcileInterruptedOperations(): Promise<void> {
    const entries = await readdir(this.paths.operations, { withFileTypes: true });
    for (const entry of entries) {
      const operationRoot = path.join(this.paths.operations, entry.name);
      if (!entry.isDirectory()) {
        throw recoveryError();
      }
      try {
        const markerText = await readFile(path.join(operationRoot, 'operation.json'), 'utf8');
        const marker = parseOperationMarker(JSON.parse(markerText));
        if (marker.operationId !== entry.name) {
          throw recoveryError();
        }
        if (marker.kind === 'import') {
          await this.recoverImportOperation(operationRoot, marker);
        } else if (marker.kind === 'revision') {
          await this.recoverRevisionOperation(operationRoot, marker);
        } else {
          await this.recoverPromotionOperation(operationRoot, marker);
        }
      } catch (error) {
        if (!hasFilesystemCode(error, 'ENOENT')) {
          if (error instanceof SkillOperationError) {
            throw error;
          }
          throw recoveryError();
        }
        await this.removePath(operationRoot);
      }
    }
  }

  private async recoverImportOperation(
    operationRoot: string,
    marker: ImportOperationMarker,
  ): Promise<void> {
    const storedPackage = this.repository.findActivePackageById(marker.packageId);
    const storedRevision = this.repository.findRevisionById(marker.revisionId);
    const packagePath = path.join(this.paths.packages, marker.packageId);
    const revisionRoot = path.join(this.paths.revisions, marker.packageId);
    const revisionPath = path.join(revisionRoot, marker.revisionId);

    if (storedPackage || storedRevision) {
      if (
        !storedPackage
        || storedRevision?.packageId !== marker.packageId
        || storedRevision.fingerprint !== marker.fingerprint
      ) {
        throw recoveryError();
      }
      const [packageObservation, revisionObservation] = await Promise.all([
        observeSkillPackage(packagePath),
        observeSkillPackage(revisionPath),
      ]);
      if (
        packageObservation.status !== 'available'
        || revisionObservation.status !== 'available'
        || revisionObservation.fingerprint !== marker.fingerprint
      ) {
        throw recoveryError();
      }
      await this.removePath(operationRoot);
      return;
    }

    if (marker.phase === 'metadata-committed') {
      throw recoveryError();
    }
    const [packageObservation, revisionObservation] = await Promise.all([
      observeSkillPackage(packagePath),
      observeSkillPackage(revisionPath),
    ]);
    if (
      packageObservation.status === 'unreadable'
      || revisionObservation.status === 'unreadable'
      || (packageObservation.status === 'available'
        && packageObservation.fingerprint !== marker.fingerprint)
      || (revisionObservation.status === 'available'
        && revisionObservation.fingerprint !== marker.fingerprint)
    ) {
      throw recoveryError();
    }
    if (
      marker.phase === 'copying'
      && (packageObservation.status === 'available' || revisionObservation.status === 'available')
    ) {
      throw recoveryError();
    }
    if (marker.phase === 'package-ready' && revisionObservation.status === 'available') {
      throw recoveryError();
    }

    if (packageObservation.status === 'available') {
      await this.removePath(packagePath);
    }
    if (revisionObservation.status === 'available') {
      await this.removePath(revisionRoot);
    }
    await this.removePath(operationRoot);
  }

  private async recoverRevisionOperation(
    operationRoot: string,
    marker: RevisionOperationMarker,
  ): Promise<void> {
    const storedPackage = this.repository.findActivePackageById(marker.packageId);
    const storedRevision = this.repository.findRevisionById(marker.revisionId);
    const revisionPath = path.join(
      this.paths.revisions,
      marker.packageId,
      marker.revisionId,
    );
    const revisionObservation = await observeSkillPackage(revisionPath);

    if (storedRevision) {
      if (
        !storedPackage
        || storedRevision.packageId !== marker.packageId
        || storedRevision.fingerprint !== marker.fingerprint
        || revisionObservation.status !== 'available'
        || revisionObservation.fingerprint !== marker.fingerprint
      ) {
        throw recoveryError();
      }
      await this.removePath(operationRoot);
      return;
    }

    if (!storedPackage || marker.phase === 'metadata-committed') {
      throw recoveryError();
    }
    if (
      revisionObservation.status === 'unreadable'
      || (revisionObservation.status === 'available'
        && revisionObservation.fingerprint !== marker.fingerprint)
      || (marker.phase === 'copying' && revisionObservation.status === 'available')
    ) {
      throw recoveryError();
    }
    if (revisionObservation.status === 'available') {
      await this.removePath(revisionPath);
    }
    await this.removePath(operationRoot);
  }

  private async recoverPromotionOperation(
    operationRoot: string,
    marker: PromotionOperationMarker,
  ): Promise<void> {
    const finalPackage = path.join(this.paths.packages, marker.packageId);
    const backupPackage = path.join(operationRoot, 'package-backup');
    const finalRevision = path.join(
      this.paths.revisions,
      marker.packageId,
      marker.revisionId,
    );
    const storedPackage = this.repository.findActivePackageById(marker.packageId);
    const storedRevision = this.repository.findRevisionById(marker.revisionId);
    const finalObservation = await observeSkillPackage(finalPackage);
    const isCommitted = storedPackage?.storeObservation.status === 'available'
      && storedPackage.storeObservation.fingerprint === marker.fingerprint
      && storedRevision?.packageId === marker.packageId
      && storedRevision.fingerprint === marker.fingerprint;
    if (isCommitted) {
      if (
        finalObservation.status !== 'available'
        || finalObservation.fingerprint !== marker.fingerprint
      ) {
        throw recoveryError();
      }
      await this.removePath(operationRoot);
      return;
    }
    if (marker.phase === 'metadata-committed' || !storedPackage) {
      throw recoveryError();
    }
    if (storedRevision && marker.createRevision) {
      throw recoveryError();
    }
    const hasBackup = await pathEntryExists(backupPackage);
    if (hasBackup) {
      if (finalObservation.status === 'available') {
        await this.removePath(finalPackage);
      } else if (finalObservation.status === 'unreadable') {
        throw recoveryError();
      }
      await rename(backupPackage, finalPackage);
    } else if (
      !marker.hadPackageBackup
      && finalObservation.status === 'available'
      && finalObservation.fingerprint === marker.fingerprint
    ) {
      await this.removePath(finalPackage);
    } else if (marker.hadPackageBackup) {
      throw recoveryError();
    }
    if (marker.createRevision && await pathEntryExists(finalRevision)) {
      await this.removePath(finalRevision);
    }
    await this.removePath(operationRoot);
  }

  async initialize(): Promise<void> {
    await this.paths.initialize();
    await this.reconcileInterruptedOperations();
    await this.reconcileStorePackages();
  }

  importPackage(sourceRoot: string): Promise<SkillImportResult> {
    return this.runSerializedMutation(() => this.importPackageUnlocked(sourceRoot, true));
  }

  importPackageAsNew(sourceRoot: string): Promise<SkillImportResult> {
    return this.runSerializedMutation(() => this.importPackageUnlocked(sourceRoot, false));
  }

  reconcileStorePackages(limit = 500): Promise<SkillPackageMetadata[]> {
    return this.runSerializedMutation(async () => {
      const observedAt = this.now();
      const packages = this.repository.listActivePackages(limit);
      const reconciled: SkillPackageMetadata[] = [];
      for (const skillPackage of packages) {
        const observation = await observeSkillPackage(
          path.join(this.paths.packages, skillPackage.id),
          observedAt,
        );
        reconciled.push(this.repository.updateStoreObservation(skillPackage.id, observation));
      }
      return reconciled;
    });
  }

  snapshotStorePackage(
    packageIdValue: unknown,
    reasonValue: unknown,
  ): Promise<SkillRevisionSnapshotResult> {
    return this.runSerializedMutation(
      () => this.snapshotStorePackageUnlocked(packageIdValue, reasonValue),
    );
  }

  promoteStorePackage(
    packageIdValue: unknown,
    sourceRoot: string,
    reason: SkillRevisionReason = 'promotion',
  ): Promise<SkillStorePromotionResult> {
    return this.runSerializedMutation(
      () => this.promoteStorePackageUnlocked(packageIdValue, sourceRoot, reason),
    );
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

async function assertFingerprint(packageRoot: string, expected: string): Promise<void> {
  if (await fingerprintSkillPackage(packageRoot) !== expected) {
    throw new SkillOperationError(
      'content-unavailable',
      'The Skill Package changed while it was being copied.',
    );
  }
}

interface ImportCompensationInput {
  finalPackage: string;
  finalRevisionRoot: string;
  operationRoot: string;
  packageOwned: boolean;
  revisionRootOwned: boolean;
  operationOwned: boolean;
  removePath: (target: string) => Promise<void>;
}

async function compensateImport(input: ImportCompensationInput): Promise<void> {
  const cleanupResults: boolean[] = [];
  if (input.packageOwned) {
    cleanupResults.push(await attemptOperation(() => input.removePath(input.finalPackage)));
  }
  if (input.revisionRootOwned) {
    cleanupResults.push(await attemptOperation(() => input.removePath(input.finalRevisionRoot)));
  }
  if (
    input.operationOwned
    && cleanupResults.every(Boolean)
  ) {
    await ignoreFailure(() => input.removePath(input.operationRoot));
  }
}

async function compensateStorePromotion(input: {
  finalPackage: string;
  backupPackage: string;
  packageReady: boolean;
  hadPackageBackup: boolean;
  removePath: (target: string) => Promise<void>;
}): Promise<boolean> {
  if (input.packageReady && !(await attemptOperation(() => input.removePath(input.finalPackage)))) {
    return false;
  }
  if (input.hadPackageBackup) {
    return attemptOperation(() => rename(input.backupPackage, input.finalPackage));
  }
  return true;
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

async function removeTree(target: string): Promise<void> {
  await rm(target, { recursive: true, force: true });
}

function recoveryError(): SkillOperationError {
  return new SkillOperationError(
    'filesystem-unavailable',
    'The Skill Store contains an interrupted operation that requires attention.',
  );
}

function hasFilesystemCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
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

function parseOperationMarker(value: unknown): SkillStoreOperationMarker {
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
      throw new Error('Invalid operation marker.');
    }
    const common = {
      version: 1 as const,
      operationId: parseSkillId(marker.operationId),
      packageId: parseSkillId(marker.packageId),
      revisionId: parseSkillRevisionId(marker.revisionId),
      fingerprint: parseSkillContentFingerprint(marker.fingerprint),
      createdAt: marker.createdAt,
    };
    if (marker.kind === 'import') {
      const phases: Array<ImportOperationMarker['phase']> = [
        'copying',
        'package-ready',
        'content-ready',
        'metadata-committed',
      ];
      if (!phases.includes(marker.phase as ImportOperationMarker['phase'])) {
        throw new Error('Invalid import operation phase.');
      }
      return {
        ...common,
        kind: 'import',
        phase: marker.phase as ImportOperationMarker['phase'],
        distributionName: parseSkillDistributionName(marker.distributionName),
      };
    }
    if (marker.kind === 'revision') {
      const phases: Array<RevisionOperationMarker['phase']> = [
        'copying',
        'content-ready',
        'metadata-committed',
      ];
      if (
        !phases.includes(marker.phase as RevisionOperationMarker['phase'])
        || !skillRevisionReasons.includes(marker.reason as SkillRevisionReason)
      ) {
        throw new Error('Invalid revision operation marker.');
      }
      return {
        ...common,
        kind: 'revision',
        phase: marker.phase as RevisionOperationMarker['phase'],
        reason: marker.reason as SkillRevisionReason,
      };
    }
    if (marker.kind === 'promotion') {
      const phases: Array<PromotionOperationMarker['phase']> = [
        'copying',
        'revision-ready',
        'backup-ready',
        'package-ready',
        'metadata-committed',
      ];
      if (
        !phases.includes(marker.phase as PromotionOperationMarker['phase'])
        || typeof marker.createRevision !== 'boolean'
        || typeof marker.hadPackageBackup !== 'boolean'
      ) {
        throw new Error('Invalid promotion operation marker.');
      }
      return {
        ...common,
        kind: 'promotion',
        phase: marker.phase as PromotionOperationMarker['phase'],
        createRevision: marker.createRevision,
        hadPackageBackup: marker.hadPackageBackup,
      };
    }
    throw new Error('Invalid operation kind.');
  } catch {
    throw recoveryError();
  }
}

async function writeOperationMarker(
  operationRoot: string,
  marker: SkillStoreOperationMarker,
): Promise<void> {
  const markerPath = path.join(operationRoot, 'operation.json');
  const temporaryMarkerPath = path.join(operationRoot, 'operation.json.tmp');
  await writeFile(temporaryMarkerPath, `${JSON.stringify(marker)}\n`, { mode: 0o600 });
  await rename(temporaryMarkerPath, markerPath);
}

async function deriveDistributionName(sourceRoot: string, packageId: string): Promise<string> {
  const manifestName = await readManifestName(path.join(sourceRoot, 'SKILL.md'));
  for (const candidate of [manifestName, path.basename(sourceRoot)]) {
    try {
      return parseSkillDistributionName(candidate);
    } catch {
      // Best-effort metadata must not prevent importing recognized package content.
    }
  }
  return `skill-${packageId}`;
}

async function readManifestName(manifestPath: string): Promise<unknown> {
  let manifestHandle;
  try {
    const manifestStats = await lstat(manifestPath);
    if (!manifestStats.isFile() || manifestStats.size > MAX_MANIFEST_FRONTMATTER_BYTES) {
      return undefined;
    }
    manifestHandle = await open(manifestPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const buffer = Buffer.alloc(manifestStats.size);
    const { bytesRead } = await manifestHandle.read(buffer, 0, buffer.length, 0);
    if (bytesRead !== buffer.length) {
      return undefined;
    }
    const lines = buffer.toString('utf8').split(/\r?\n/);
    if (lines[0] !== '---') {
      return undefined;
    }
    const closingIndex = lines.findIndex(
      (line, index) => index > 0 && (line === '---' || line === '...'),
    );
    if (closingIndex === -1) {
      return undefined;
    }
    const document = parseDocument(lines.slice(1, closingIndex).join('\n'));
    if (document.errors.length > 0) {
      return undefined;
    }
    return document.get('name');
  } catch {
    return undefined;
  } finally {
    if (manifestHandle) {
      await ignoreFailure(() => manifestHandle.close());
    }
  }
}
