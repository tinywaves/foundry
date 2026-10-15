import type {
  SkillApplyUpdateResult,
  SkillSourceView,
  SkillUpdateCandidateView,
  SkillUpdateCheckResult,
} from '../../shared/skill-contract';
import type { SkillClawHubProvider } from './skill-clawhub-provider';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import type { SkillMetadataRepository } from './skill-metadata-repository';
import type { SkillOperationQueue } from './skill-operation-queue';
import type {
  SkillMaterializedSourceRevision,
  SkillResolvedSourceRevision,
} from './skill-remote-source';
import type { SkillSourceRepository } from './skill-source-repository';
import type { SkillStoreCoordinator } from './skill-store-coordinator';
import { parseSkillId, parseSkillSourceId } from './skill-validation';

interface SkillUpdateCoordinatorOptions {
  metadataRepository: SkillMetadataRepository;
  sourceRepository: SkillSourceRepository;
  storeCoordinator: SkillStoreCoordinator;
  gitSourceCoordinator: SkillGitSourceCoordinator;
  clawHubProvider: SkillClawHubProvider;
  operationQueue: SkillOperationQueue;
  now?: () => number;
}

const unavailableErrorCodes = new Set([
  'authentication-required',
  'network-unavailable',
  'operation-timeout',
  'rate-limited',
  'resource-limit',
  'source-unavailable',
]);

export class SkillUpdateCoordinator {
  private readonly now: () => number;
  private readonly checks = new Map<string, Promise<SkillUpdateCheckResult>>();

  constructor(private readonly options: SkillUpdateCoordinatorOptions) {
    this.now = options.now ?? Date.now;
  }

  checkSource(sourceIdValue: unknown): Promise<SkillUpdateCheckResult> {
    const sourceId = parseSkillSourceId(sourceIdValue);
    const existing = this.checks.get(sourceId);
    if (existing) {
      return existing;
    }
    const operation = this.runSourceCheck(sourceId);
    this.checks.set(sourceId, operation);
    return operation;
  }

  async checkPackage(packageIdValue: unknown): Promise<SkillUpdateCheckResult[]> {
    const packageId = parseSkillId(packageIdValue);
    const sources = this.options.sourceRepository.listSources(packageId);
    return Promise.all(sources.map((source) => this.checkSource(source.id)));
  }

  apply(candidate: SkillUpdateCandidateView): Promise<SkillApplyUpdateResult> {
    return this.options.operationQueue.run(() => this.applyUnlocked(candidate));
  }

  // eslint-disable-next-line unicorn/consistent-class-member-order
  private async applyUnlocked(candidate: SkillUpdateCandidateView): Promise<SkillApplyUpdateResult> {
    const source = this.options.sourceRepository.getSource(candidate.sourceId);
    if (source.packageId !== candidate.packageId) {
      throw new SkillOperationError(
        'stale-result',
        'The Update Candidate no longer matches its Skill Package.',
      );
    }
    if (source.trackingMode !== 'tracked') {
      throw new SkillOperationError('conflict', 'Fixed Skill Sources do not track updates.');
    }
    const materialized = await this.materializeSource(source, candidate.resolvedRevision);
    try {
      if (
        materialized.resolvedRevision !== candidate.resolvedRevision
        || !hasMatchingDigest(materialized.artifactDigest, candidate.artifactDigest)
      ) {
        throw new SkillOperationError(
          'stale-result',
          'The acquired Source did not match the Update Candidate.',
        );
      }
      const before = this.options.metadataRepository.getActivePackage(candidate.packageId);
      const prepared = await this.options.storeCoordinator.preparePackageContent(
        materialized.contentRoot,
        candidate.packageId,
      );
      const committed = this.options.sourceRepository.commitRemoteUpdate({
        sourceId: source.id,
        distributionName: prepared.distributionName,
        description: prepared.description,
        content: prepared.encoded.content,
        fingerprint: prepared.encoded.fingerprint,
        resolvedRevision: materialized.resolvedRevision,
        artifactDigest: materialized.artifactDigest,
        canonicalWebUrl: materialized.canonicalWebUrl,
        fetchedAt: this.now(),
      });
      return {
        skillPackage: committed.skillPackage,
        source: committed.source,
        contentChanged: before.fingerprint !== committed.skillPackage.fingerprint,
      };
    } finally {
      await ignoreFailure(materialized.release);
    }
  }

  private async checkSourceOnce(sourceId: string): Promise<SkillUpdateCheckResult> {
    const source = this.options.sourceRepository.getSource(sourceId);
    if (source.trackingMode === 'fixed') {
      return { status: 'fixed', source };
    }
    const checkedAt = this.now();
    try {
      const resolved = await this.resolveSource(source);
      if (resolved.resolvedRevision === source.resolvedRevision) {
        if (!hasMatchingDigest(resolved.artifactDigest, source.artifactDigest)) {
          throw new SkillOperationError(
            'source-unavailable',
            'The remote immutable revision changed content.',
          );
        }
        return { status: 'current', source };
      }
      return {
        status: 'update-available',
        source,
        candidate: {
          sourceId: source.id,
          packageId: source.packageId,
          resolvedRevision: resolved.resolvedRevision,
          artifactDigest: resolved.artifactDigest,
          canonicalWebUrl: resolved.canonicalWebUrl,
          checkedAt,
        },
      };
    } catch (error) {
      const skillError = toSkillOperationError(error);
      if (!unavailableErrorCodes.has(skillError.code)) {
        throw skillError;
      }
      return { status: 'unavailable', source };
    }
  }

  private resolveSource(source: SkillSourceView): Promise<SkillResolvedSourceRevision> {
    switch (source.provider) {
      case 'git': {
        return this.options.gitSourceCoordinator.resolveSourceRevision(source);
      }
      case 'clawhub': {
        return this.options.clawHubProvider.resolveSourceRevision(source);
      }
      default: {
        source.provider satisfies never;
        throw new SkillOperationError('invalid-input', 'The Skill Source provider is unsupported.');
      }
    }
  }

  private async runSourceCheck(sourceId: string): Promise<SkillUpdateCheckResult> {
    try {
      return await this.checkSourceOnce(sourceId);
    } finally {
      this.checks.delete(sourceId);
    }
  }

  private materializeSource(
    source: SkillSourceView,
    expectedRevision: string,
  ): Promise<SkillMaterializedSourceRevision> {
    switch (source.provider) {
      case 'git': {
        return this.options.gitSourceCoordinator.materializeSourceRevision(
          source,
          expectedRevision,
        );
      }
      case 'clawhub': {
        return this.options.clawHubProvider.materializeSourceRevision(
          source,
          expectedRevision,
        );
      }
      default: {
        source.provider satisfies never;
        throw new SkillOperationError('invalid-input', 'The Skill Source provider is unsupported.');
      }
    }
  }
}

function hasMatchingDigest(left: string | null, right: string | null): boolean {
  return left === null || right === null || left === right;
}

async function ignoreFailure(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    // Remote staging is disposable after the Store transaction commits or fails.
  }
}
