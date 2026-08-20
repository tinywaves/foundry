import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import {
  access,
  lstat,
  mkdir,
  readdir,
  rename,
  rm,
  stat,
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
  SkillMetadataRepository,
} from './skill-metadata-repository';
import type { SkillOperationQueue } from './skill-operation-queue';
import { materializeInspectedSkillPackage } from './skill-package-codec';
import type { SkillStoreCoordinator } from './skill-store-coordinator';
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
  parseSkillDistributionInput,
  parseSkillDistributionName,
  parseSkillInstallationCommandInput,
  parseSkillInstallationId,
  parseSkillRelativePath,
} from './skill-validation';

interface SkillTargetMutationCoordinatorOptions {
  metadataRepository: SkillMetadataRepository;
  targetRepository: SkillTargetRepository;
  installationRepository: SkillInstallationRepository;
  storeCoordinator: SkillStoreCoordinator;
  operationQueue: SkillOperationQueue;
  createId?: () => string;
  now?: () => number;
  removePath?: (targetPath: string) => Promise<void>;
}

interface PreparedTarget {
  target: SkillTargetMetadata;
  rootPath: string;
  installation: SkillInstallationMetadata | null;
  distributionName: string;
  relativePath: string;
  finalPath: string;
  operation: 'install' | 'none' | 'replace';
}

export type SkillTargetMutationResult
  = | {
    targetId: string;
    ok: true;
    installationId: string;
  }
  | {
    targetId: string;
    ok: false;
    error: SkillApiError;
  };

export interface SkillDistributionMutationResult {
  skillId: string;
  targets: SkillTargetMutationResult[];
}

export class SkillTargetMutationCoordinator {
  private readonly createId: () => string;
  private readonly now: () => number;
  private readonly removePath: (targetPath: string) => Promise<void>;

  constructor(private readonly options: SkillTargetMutationCoordinatorOptions) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? Date.now;
    this.removePath = options.removePath ?? removeTree;
  }

  preflightDistribution(inputValue: unknown): Promise<SkillDistributionPreflightResult> {
    return this.options.operationQueue.run(() => this.preflightUnlocked(inputValue));
  }

  distribute(inputValue: unknown): Promise<SkillDistributionMutationResult> {
    return this.options.operationQueue.run(() => this.distributeUnlocked(inputValue));
  }

  uninstall(inputValue: unknown): Promise<null> {
    return this.options.operationQueue.run(() => this.uninstallUnlocked(inputValue));
  }

  // eslint-disable-next-line unicorn/consistent-class-member-order
  private async preflightUnlocked(inputValue: unknown): Promise<SkillDistributionPreflightResult> {
    const input = parseSkillDistributionInput(inputValue);
    const skillPackage = this.options.metadataRepository.getActivePackage(input.skillId);
    const seenPathKeys = new Set<string>();
    const targets: SkillDistributionTargetPreflight[] = [];
    for (const targetId of input.targetIds) {
      try {
        const target = this.options.targetRepository.getTarget(targetId);
        const prepared = await this.prepareTarget(skillPackage, target, seenPathKeys);
        if ('status' in prepared) {
          targets.push(prepared);
        } else {
          targets.push({
            targetId,
            status: 'ready',
            operation: prepared.operation,
            installationId: prepared.installation?.id ?? null,
          });
        }
      } catch (error) {
        targets.push(conflict(
          targetId,
          'target-unavailable',
          toSkillOperationError(error).message,
        ));
      }
    }
    return {
      skillId: skillPackage.id,
      distributionName: skillPackage.distributionName,
      targets,
    };
  }

  private async distributeUnlocked(inputValue: unknown): Promise<SkillDistributionMutationResult> {
    const input = parseSkillDistributionInput(inputValue);
    const verified = await this.options.storeCoordinator.getVerifiedPackageContent(input.skillId);
    const preflight = await this.preflightUnlocked(input);
    const targets: SkillTargetMutationResult[] = [];
    for (const targetPreflight of preflight.targets) {
      if (targetPreflight.status === 'conflict') {
        targets.push({
          targetId: targetPreflight.targetId,
          ok: false,
          error: { code: 'conflict', message: targetPreflight.message },
        });
        continue;
      }
      targets.push(await this.distributeToTarget(
        verified.package,
        verified.inspected,
        targetPreflight.targetId,
      ));
    }
    return { skillId: verified.package.id, targets };
  }

  private async distributeToTarget(
    skillPackage: SkillPackageMetadata,
    inspected: Awaited<ReturnType<SkillStoreCoordinator['getVerifiedPackageContent']>>['inspected'],
    targetId: string,
  ): Promise<SkillTargetMutationResult> {
    let stagedPath: string | undefined;
    try {
      const target = this.options.targetRepository.getTarget(targetId);
      const prepared = await this.prepareTarget(skillPackage, target);
      if ('status' in prepared) {
        throw new SkillOperationError('conflict', prepared.message);
      }
      if (prepared.operation === 'none' && prepared.installation) {
        return { targetId, ok: true, installationId: prepared.installation.id };
      }

      const installationId = getInstallationId(
        prepared.installation,
        skillPackage.id,
        this.createId,
      );
      const operationId = this.createId();
      const finalParent = path.dirname(prepared.finalPath);
      stagedPath = path.join(finalParent, `.foundry-${operationId}-stage`);
      await mkdir(finalParent, { recursive: true });
      if (await pathEntryExists(stagedPath)) {
        throw new SkillOperationError('conflict', 'A Target staging path is occupied.');
      }
      await materializeInspectedSkillPackage(inspected, stagedPath);
      await this.removePath(prepared.finalPath);
      await rename(stagedPath, prepared.finalPath);
      stagedPath = undefined;
      this.options.installationRepository.recordDistribution({
        installationId,
        packageId: skillPackage.id,
        targetId,
        distributionName: prepared.distributionName,
        relativePath: prepared.relativePath,
        fingerprint: skillPackage.fingerprint,
        distributedAt: this.now(),
      });
      return { targetId, ok: true, installationId };
    } catch (error) {
      if (stagedPath !== undefined) {
        await ignoreFailure(() => this.removePath(stagedPath!));
      }
      return { targetId, ok: false, error: toSkillOperationError(error).toApiError() };
    }
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
    const packageInstallations = this.options.installationRepository
      .listActiveInstallations(target.id)
      .filter((installation) => installation.packageId === skillPackage.id);
    const occupiedEntry = namedInstallation
      ? null
      : await findNormalizedRootEntry(rootPath, distributionName);
    const preferredInstallation = namedInstallation
      ?? (packageInstallations.length === 1 ? packageInstallations[0] : null);
    const relativePath = preferredInstallation?.relativePath ?? occupiedEntry ?? distributionName;
    const finalPath = resolveContainedTargetPath(rootPath, relativePath);
    const installation = this.options.installationRepository
      .findActiveInstallationByLocation(target.id, relativePath);
    const isCurrent = installation?.packageId === skillPackage.id
      && installation.distributedFingerprint === skillPackage.fingerprint;
    const operation = isCurrent
      ? 'none'
      : (await pathEntryExists(finalPath) ? 'replace' : 'install');
    return {
      target,
      rootPath,
      installation,
      distributionName,
      relativePath,
      finalPath,
      operation,
    };
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
    await this.removePath(finalPath);
    this.options.installationRepository.markInstallationUninstalled(
      installation.id,
      this.now(),
    );
    return null;
  }
}

function conflict(
  targetId: string,
  code: Extract<SkillDistributionTargetPreflight, { status: 'conflict' }>['code'],
  message: string,
): Extract<SkillDistributionTargetPreflight, { status: 'conflict' }> {
  return { targetId, status: 'conflict', code, message };
}

function getInstallationId(
  installation: SkillInstallationMetadata | null,
  packageId: string,
  createId: () => string,
): string {
  return installation?.packageId === packageId
    ? installation.id
    : parseSkillInstallationId(createId());
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

async function ignoreFailure(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    // Best-effort staging cleanup does not change the reported Target result.
  }
}

function hasFilesystemCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
}
