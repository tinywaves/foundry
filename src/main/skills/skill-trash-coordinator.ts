import { constants } from 'node:fs';
import { access, lstat, rm } from 'node:fs/promises';
import path from 'node:path';
import type { SkillApiError } from '../../shared/skill-contract';
import { toSkillOperationError } from './skill-error';
import type { SkillInstallationRepository } from './skill-installation-repository';
import type {
  SkillTrashPackageMetadata,
  SkillMetadataRepository,
} from './skill-metadata-repository';
import type { SkillOperationQueue } from './skill-operation-queue';
import { normalizeResolvedPathKey, resolvePhysicalPath } from './skill-target-adapters';
import type { SkillTargetRepository } from './skill-target-repository';
import { parseSkillId, parseSkillRelativePath } from './skill-validation';

export interface SkillStoreDeletionTarget {
  installationId: string;
  targetId: string;
  targetName: string;
  path: string;
  status: 'missing' | 'ready' | 'unavailable';
  message: string | null;
}

export interface SkillStoreDeletionPreflight {
  skillId: string;
  targets: SkillStoreDeletionTarget[];
}

export interface SkillStoreDeletionResult {
  deleted: boolean;
  skillPackage: SkillTrashPackageMetadata | null;
  failures: Array<{
    installationId: string;
    targetId: string;
    error: SkillApiError;
  }>;
}

export interface EmptySkillTrashResult {
  removedIds: string[];
  failures: Array<{ skillId: string; error: SkillApiError }>;
}

interface SkillTrashCoordinatorOptions {
  metadataRepository: SkillMetadataRepository;
  installationRepository: SkillInstallationRepository;
  targetRepository: SkillTargetRepository;
  operationQueue: SkillOperationQueue;
  now?: () => number;
  removePath?: (targetPath: string) => Promise<void>;
}

export class SkillTrashCoordinator {
  private readonly now: () => number;
  private readonly removePath: (targetPath: string) => Promise<void>;

  constructor(private readonly options: SkillTrashCoordinatorOptions) {
    this.now = options.now ?? Date.now;
    this.removePath = options.removePath ?? removeTree;
  }

  preflightStoreDeletion(packageIdValue: unknown): Promise<SkillStoreDeletionPreflight> {
    return this.options.operationQueue.run(() => this.preflightUnlocked(packageIdValue));
  }

  movePackageToTrash(packageIdValue: unknown): Promise<SkillStoreDeletionResult> {
    return this.options.operationQueue.run(() => this.deleteUnlocked(packageIdValue));
  }

  listTrash(): SkillTrashPackageMetadata[] {
    return this.options.metadataRepository.listTrashedPackages();
  }

  restoreTrashedPackage(packageIdValue: unknown): SkillTrashPackageMetadata['id'] extends string
    ? ReturnType<SkillMetadataRepository['restoreTrashedPackage']>
    : never {
    return this.options.metadataRepository.restoreTrashedPackage(packageIdValue, this.now());
  }

  removeTrashedPackage(packageIdValue: unknown): null {
    this.options.metadataRepository.markTrashedPackageRemoved(packageIdValue, this.now());
    return null;
  }

  emptyTrash(): EmptySkillTrashResult {
    const removedIds: string[] = [];
    const failures: EmptySkillTrashResult['failures'] = [];
    for (const skillPackage of this.options.metadataRepository.listTrashedPackages()) {
      try {
        this.options.metadataRepository.markTrashedPackageRemoved(
          skillPackage.id,
          this.now(),
        );
        removedIds.push(skillPackage.id);
      } catch (error) {
        failures.push({
          skillId: skillPackage.id,
          error: toSkillOperationError(error).toApiError(),
        });
      }
    }
    return { removedIds, failures };
  }

  // eslint-disable-next-line unicorn/consistent-class-member-order
  private async preflightUnlocked(packageIdValue: unknown): Promise<SkillStoreDeletionPreflight> {
    const packageId = parseSkillId(packageIdValue);
    this.options.metadataRepository.getActivePackage(packageId);
    const installations = this.options.installationRepository
      .listActiveInstallationsForPackage(packageId);
    const targets: SkillStoreDeletionTarget[] = [];
    for (const installation of installations) {
      try {
        const target = this.options.targetRepository.getTarget(installation.targetId);
        const rootPath = await resolvePhysicalPath(target.configuredPath);
        if (normalizeResolvedPathKey(rootPath) !== target.resolvedPathKey) {
          throw new Error('The Distribution Target changed.');
        }
        const installationPath = resolveContainedTargetPath(rootPath, installation.relativePath);
        const isMissing = !(await pathEntryExists(installationPath));
        if (!isMissing) {
          await access(path.dirname(installationPath), constants.W_OK);
        }
        targets.push({
          installationId: installation.id,
          targetId: target.id,
          targetName: target.displayName,
          path: installationPath,
          status: isMissing ? 'missing' : 'ready',
          message: null,
        });
      } catch (error) {
        const target = this.options.targetRepository.getTarget(installation.targetId);
        targets.push({
          installationId: installation.id,
          targetId: target.id,
          targetName: target.displayName,
          path: path.join(target.configuredPath, installation.relativePath),
          status: 'unavailable',
          message: toSkillOperationError(error).message,
        });
      }
    }
    return { skillId: packageId, targets };
  }

  private async deleteUnlocked(packageIdValue: unknown): Promise<SkillStoreDeletionResult> {
    const preflight = await this.preflightUnlocked(packageIdValue);
    const failures: SkillStoreDeletionResult['failures'] = [];
    for (const target of preflight.targets) {
      if (target.status === 'unavailable') {
        failures.push({
          installationId: target.installationId,
          targetId: target.targetId,
          error: { code: 'filesystem-unavailable', message: target.message ?? 'Target unavailable.' },
        });
        continue;
      }
      try {
        await this.removePath(target.path);
      } catch (error) {
        failures.push({
          installationId: target.installationId,
          targetId: target.targetId,
          error: toSkillOperationError(error).toApiError(),
        });
      }
    }
    if (failures.length > 0) {
      return { deleted: false, skillPackage: null, failures };
    }
    return {
      deleted: true,
      skillPackage: this.options.metadataRepository.commitStoreDeletion(
        preflight.skillId,
        this.now(),
      ),
      failures: [],
    };
  }
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
    throw new Error('Skill Installation path escaped its Target.');
  }
  return finalPath;
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

function hasFilesystemCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
}
