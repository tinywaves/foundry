import { randomUUID } from 'node:crypto';
import type {
  SkillApplyUpdateResult,
  SkillSourceView,
  SkillUpdateCheckResult,
} from '../../shared/skill-contract';
import type { SkillClawHubProvider } from './skill-clawhub-provider';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import type { SkillMetadataRepository } from './skill-metadata-repository';
import type {
  SkillMaterializedSourceRevision,
  SkillResolvedSourceRevision,
} from './skill-remote-source';
import type { SkillSourceRepository } from './skill-source-repository';
import type { SkillStoreCoordinator } from './skill-store-coordinator';
import {
  parseSkillId,
  parseSkillSourceId,
  parseSkillUpdateCandidateId,
} from './skill-validation';

interface SkillUpdateCoordinatorOptions {
  metadataRepository: SkillMetadataRepository;
  sourceRepository: SkillSourceRepository;
  storeCoordinator: SkillStoreCoordinator;
  gitSourceCoordinator: SkillGitSourceCoordinator;
  clawHubProvider: SkillClawHubProvider;
  createId?: () => string;
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
  private readonly createId: () => string;
  private readonly now: () => number;
  private readonly checks = new Map<string, Promise<SkillUpdateCheckResult>>();

  constructor(private readonly options: SkillUpdateCoordinatorOptions) {
    this.createId = options.createId ?? randomUUID;
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

  async apply(candidateIdValue: unknown): Promise<SkillApplyUpdateResult> {
    const candidateId = parseSkillUpdateCandidateId(candidateIdValue);
    const candidate = this.options.sourceRepository.getActiveCandidate(candidateId);
    const source = this.options.sourceRepository.getSource(candidate.sourceId);
    if (source.trackingMode !== 'tracked') {
      throw new SkillOperationError('conflict', 'Fixed Skill Sources do not track updates.');
    }
    const resolved = await this.resolveSource(source);
    if (
      resolved.resolvedRevision !== candidate.resolvedRevision
      || !hasMatchingDigest(resolved.artifactDigest, candidate.artifactDigest)
    ) {
      throw new SkillOperationError(
        'stale-result',
        'The remote Source changed after Update Check.',
      );
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
      const promoted = await this.options.storeCoordinator.promoteStorePackage(
        candidate.packageId,
        materialized.contentRoot,
        'remote-update',
      );
      if (promoted.package.storeObservation.status !== 'available') {
        throw new SkillOperationError('content-unavailable', 'The updated Store content is unavailable.');
      }
      const sourceView = this.options.sourceRepository.markCandidateApplied({
        candidateId,
        resolvedRevision: materialized.resolvedRevision,
        artifactDigest: materialized.artifactDigest,
        observedContentFingerprint: promoted.package.storeObservation.fingerprint,
        canonicalWebUrl: materialized.canonicalWebUrl,
        fetchedAt: this.now(),
      });
      const hasContentChanged = before.storeObservation.status !== 'available'
        || before.storeObservation.fingerprint
        !== promoted.package.storeObservation.fingerprint;
      return {
        skillPackage: promoted.package,
        revisionId: promoted.revision.id,
        source: sourceView,
        contentChanged: hasContentChanged,
      };
    } finally {
      await ignoreFailure(materialized.release);
    }
  }

  // eslint-disable-next-line unicorn/consistent-class-member-order
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
        return {
          status: 'current',
          source: this.options.sourceRepository.recordCurrent(source.id, checkedAt),
        };
      }
      const updatedSource = this.options.sourceRepository.recordUpdateCandidate({
        id: parseSkillUpdateCandidateId(this.createId()),
        sourceId: source.id,
        resolvedRevision: resolved.resolvedRevision,
        artifactDigest: resolved.artifactDigest,
        canonicalWebUrl: resolved.canonicalWebUrl,
        checkedAt,
      });
      if (updatedSource.check.status !== 'update-available') {
        throw new SkillOperationError('storage-corrupt', 'Stored Update Candidate is invalid.');
      }
      return {
        status: 'update-available',
        source: updatedSource,
        candidate: updatedSource.check.candidate,
      };
    } catch (error) {
      const skillError = toSkillOperationError(error);
      if (!unavailableErrorCodes.has(skillError.code)) {
        throw skillError;
      }
      return {
        status: 'unavailable',
        source: this.options.sourceRepository.recordUnavailable(source.id, checkedAt),
      };
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
    // Startup recovery removes marker-owned staging after cleanup failures.
  }
}
