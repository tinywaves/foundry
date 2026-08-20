import path from 'node:path';
import type { SkillDiscoveryResult } from '../../shared/skill-contract';
import { scanSkillTarget } from './skill-discovery-scanner';
import type { SkillTargetScanResult } from './skill-discovery-scanner';
import type { SkillInstallationRepository } from './skill-installation-repository';
import type { SkillStoreCoordinator } from './skill-store-coordinator';
import {
  resolveBuiltInSkillTargets,
  resolvePhysicalPath,
} from './skill-target-adapters';
import type {
  ResolvedBuiltInSkillTarget,
  SkillTargetAdapterContext,
} from './skill-target-adapters';
import type {
  SkillTargetMetadata,
  SkillTargetRepository,
} from './skill-target-repository';
import type { SkillOperationQueue } from './skill-operation-queue';

interface SkillDiscoveryCoordinatorOptions extends SkillTargetAdapterContext {
  targetRepository: SkillTargetRepository;
  installationRepository: SkillInstallationRepository;
  storeCoordinator: SkillStoreCoordinator;
  now?: () => number;
  resolveTargets?: (
    context: SkillTargetAdapterContext,
  ) => Promise<ResolvedBuiltInSkillTarget[]>;
  operationQueue?: SkillOperationQueue;
}

export class SkillDiscoveryCoordinator {
  private readonly now: () => number;
  private readonly resolveTargets: NonNullable<SkillDiscoveryCoordinatorOptions['resolveTargets']>;
  private scanTail: Promise<boolean> = Promise.resolve(true);

  constructor(private readonly options: SkillDiscoveryCoordinatorOptions) {
    this.now = options.now ?? Date.now;
    this.resolveTargets = options.resolveTargets ?? resolveBuiltInSkillTargets;
  }

  private async scanUnlocked(): Promise<SkillDiscoveryResult> {
    const definitions = await this.resolveTargets({
      userHomeDirectory: this.options.userHomeDirectory,
      environment: this.options.environment,
      platform: this.options.platform,
    });
    this.options.targetRepository.synchronizeBuiltInTargets(definitions);
    const targets = this.options.targetRepository.listTargets();
    const importedAt = this.now();
    const result: SkillDiscoveryResult = {
      roots: [],
      rootsInspected: 0,
      packagesFound: 0,
      packagesImported: 0,
      installationsAdopted: 0,
      warnings: [],
      rootFailures: [],
    };

    for (const target of targets) {
      if (!target.enabled) {
        continue;
      }
      await this.scanTarget(target, definitions, importedAt, result);
    }
    return result;
  }

  private async scanTarget(
    target: SkillTargetMetadata,
    definitions: readonly ResolvedBuiltInSkillTarget[],
    importedAt: number,
    result: SkillDiscoveryResult,
  ): Promise<void> {
    const definition = definitions.find((candidate) => candidate.kind === target.kind);
    let scanResult: SkillTargetScanResult;
    try {
      scanResult = await scanSkillTarget({
        targetId: target.id,
        rootPath: await resolvePhysicalPath(target.configuredPath),
        maxScanDepth: target.maxScanDepth,
        allowSymlinkEscape: target.allowSymlinkEscape,
        excludedRootEntries: definition?.excludedRootEntries ?? [],
      });
    } catch {
      scanResult = {
        targetId: target.id,
        rootPath: target.resolvedPath,
        rootStatus: 'unreadable',
        candidates: [],
        warnings: [],
        directoriesInspected: 0,
        truncated: false,
      };
    }
    result.roots.push({
      targetId: target.id,
      rootPath: scanResult.rootPath,
      status: scanResult.rootStatus,
      packagesFound: scanResult.candidates.length,
      truncated: scanResult.truncated,
    });
    result.warnings.push(...scanResult.warnings.map((warning) => ({
      targetId: target.id,
      relativePath: warning.relativePath,
      code: warning.code,
    })));
    if (scanResult.rootStatus !== 'scanned') {
      if (scanResult.rootStatus === 'unreadable') {
        result.rootFailures.push({ targetId: target.id, status: scanResult.rootStatus });
      }
      return;
    }

    result.rootsInspected += 1;
    result.packagesFound += scanResult.candidates.length;
    for (const candidate of scanResult.candidates) {
      await this.reconcileCandidate(target, candidate, importedAt, result);
    }
  }

  private async reconcileCandidate(
    target: SkillTargetMetadata,
    candidate: { relativePath: string; contentPath: string },
    importedAt: number,
    result: SkillDiscoveryResult,
  ): Promise<void> {
    const existing = this.options.installationRepository.findActiveInstallationByLocation(
      target.id,
      candidate.relativePath,
    );
    if (existing) {
      return;
    }

    try {
      const imported = await this.options.storeCoordinator.importPackage(candidate.contentPath);
      if (!imported.reused) {
        result.packagesImported += 1;
      }
      const adoption = this.options.installationRepository.adoptInstallation({
        packageId: imported.package.id,
        targetId: target.id,
        distributionName: path.posix.basename(candidate.relativePath),
        relativePath: candidate.relativePath,
        fingerprint: imported.package.fingerprint,
        importedAt,
      });
      if (!adoption.reused) {
        result.installationsAdopted += 1;
      }
    } catch {
      result.warnings.push({
        targetId: target.id,
        relativePath: candidate.relativePath,
        code: 'candidate-reconciliation-failed',
      });
    }
  }

  private async serializeScan<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.scanTail;
    const gate = Promise.withResolvers<boolean>();
    this.scanTail = gate.promise;
    await previous;
    try {
      return await operation();
    } finally {
      gate.resolve(true);
    }
  }

  scan(): Promise<SkillDiscoveryResult> {
    return this.options.operationQueue
      ? this.options.operationQueue.run(() => this.scanUnlocked())
      : this.serializeScan(() => this.scanUnlocked());
  }
}
