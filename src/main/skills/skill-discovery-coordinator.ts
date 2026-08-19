import path from 'node:path';
import type { SkillDiscoveryResult } from '../../shared/skill-contract';
import { scanSkillTarget } from './skill-discovery-scanner';
import type { SkillTargetScanResult } from './skill-discovery-scanner';
import type { SkillInstallationRepository } from './skill-installation-repository';
import { observeSkillPackage } from './skill-package-observer';
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
import { normalizeSkillRelativePath } from './skill-validation';
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
    const observedAt = this.now();
    const result: SkillDiscoveryResult = {
      roots: [],
      rootsInspected: 0,
      packagesFound: 0,
      packagesImported: 0,
      installationsAdopted: 0,
      observationsUpdated: 0,
      warnings: [],
      rootFailures: [],
    };

    for (const target of targets) {
      if (!target.enabled) {
        continue;
      }
      await this.scanTarget(target, definitions, observedAt, result);
    }
    return result;
  }

  private async scanTarget(
    target: SkillTargetMetadata,
    definitions: readonly ResolvedBuiltInSkillTarget[],
    observedAt: number,
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
    const observedRelativePaths = new Set<string>();
    for (const candidate of scanResult.candidates) {
      observedRelativePaths.add(normalizeSkillRelativePath(candidate.relativePath));
      await this.reconcileCandidate(target, candidate, observedAt, result);
    }

    const isCompleteObservation = !scanResult.truncated
      && scanResult.warnings.every((warning) => warning.code !== 'entry-unreadable');
    if (isCompleteObservation) {
      result.observationsUpdated += this.options.installationRepository
        .markMissingInstallations(target.id, observedRelativePaths, observedAt)
        .length;
    }
  }

  private async reconcileCandidate(
    target: SkillTargetMetadata,
    candidate: { relativePath: string; contentPath: string },
    observedAt: number,
    result: SkillDiscoveryResult,
  ): Promise<void> {
    const observation = await observeSkillPackage(candidate.contentPath, observedAt);
    if (observation.status !== 'available') {
      result.warnings.push({
        targetId: target.id,
        relativePath: candidate.relativePath,
        code: 'candidate-unreadable',
      });
      return;
    }
    const existing = this.options.installationRepository.findActiveInstallationByLocation(
      target.id,
      candidate.relativePath,
    );
    if (existing) {
      this.options.installationRepository.updateInstallationObservation(
        existing.id,
        observation,
      );
      result.observationsUpdated += 1;
      return;
    }

    try {
      const imported = await this.options.storeCoordinator.importPackage(candidate.contentPath);
      if (!imported.reused) {
        result.packagesImported += 1;
      }
      let revision = imported.revision;
      if (!revision) {
        const snapshot = await this.options.storeCoordinator.snapshotStorePackage(
          imported.package.id,
          'distribution',
        );
        revision = snapshot.revision;
      }
      if (revision.fingerprint !== observation.fingerprint) {
        result.warnings.push({
          targetId: target.id,
          relativePath: candidate.relativePath,
          code: 'content-changed-during-adoption',
        });
        return;
      }
      const adoption = this.options.installationRepository.adoptInstallation({
        packageId: imported.package.id,
        targetId: target.id,
        revisionId: revision.id,
        distributionName: path.posix.basename(candidate.relativePath),
        relativePath: candidate.relativePath,
        fingerprint: observation.fingerprint,
        observedAt,
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
