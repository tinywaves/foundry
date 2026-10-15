import type {
  SkillAddRemoteCandidateResult,
  SkillDiscoveryProvider,
  SkillGitResolutionView,
  SkillRemoteDetailView,
  SkillRemoteResultView,
} from '../../shared/skill-contract';
import type { SkillClawHubProvider } from './skill-clawhub-provider';
import { SkillOperationError } from './skill-error';
import type { SkillGitSourceCoordinator } from './skill-git-source-coordinator';
import type { SkillProviderHttpClient } from './skill-provider-http-client';
import type { SkillSkillsShProvider } from './skill-skills-sh-provider';

interface SkillRemoteDiscoveryCoordinatorOptions {
  clawHub: SkillClawHubProvider;
  skillsSh: SkillSkillsShProvider;
  gitSourceCoordinator: SkillGitSourceCoordinator;
  httpClient: SkillProviderHttpClient;
}

export class SkillRemoteDiscoveryCoordinator {
  constructor(private readonly options: SkillRemoteDiscoveryCoordinatorOptions) {}

  browse(
    ownerId: number,
    provider: SkillDiscoveryProvider,
  ): Promise<SkillRemoteResultView[]> {
    if (provider !== 'clawhub') {
      throw new SkillOperationError(
        'invalid-input',
        'This Skill Directory supports search only.',
      );
    }
    return this.options.clawHub.browse(ownerId);
  }

  search(
    ownerId: number,
    provider: SkillDiscoveryProvider,
    query: string,
  ): Promise<SkillRemoteResultView[]> {
    switch (provider) {
      case 'clawhub': {
        return this.options.clawHub.search(ownerId, query);
      }
      case 'skills-sh': {
        return this.options.skillsSh.search(ownerId, query);
      }
      default: {
        provider satisfies never;
        throw new SkillOperationError('invalid-input', 'Select a discovery provider.');
      }
    }
  }

  getDetails(ownerId: number, resultId: unknown): Promise<SkillRemoteDetailView> {
    if (!this.options.clawHub.hasResult(ownerId, resultId)) {
      throw new SkillOperationError(
        'invalid-input',
        'Skill Directory results resolve through Git instead of registry details.',
      );
    }
    return this.options.clawHub.getDetails(ownerId, resultId);
  }

  resolveDirectoryResult(
    ownerId: number,
    resultId: unknown,
  ): Promise<SkillGitResolutionView> {
    return this.options.skillsSh.resolve(ownerId, resultId);
  }

  addToStore(
    ownerId: number,
    candidateId: unknown,
  ): Promise<SkillAddRemoteCandidateResult> {
    if (this.options.clawHub.hasVersionCandidate(ownerId, candidateId)) {
      return this.options.clawHub.addToStore(ownerId, candidateId);
    }
    return this.options.gitSourceCoordinator.addToStore(ownerId, candidateId);
  }

  getResultUrl(ownerId: number, resultId: unknown): string {
    if (this.options.clawHub.hasResult(ownerId, resultId)
      || this.options.clawHub.hasVersionCandidate(ownerId, resultId)) {
      return this.options.clawHub.getResultUrl(ownerId, resultId);
    }
    if (this.options.skillsSh.hasResult(ownerId, resultId)) {
      return this.options.skillsSh.getResultUrl(ownerId, resultId);
    }
    throw new SkillOperationError('stale-result', 'Search for the remote Skill again.');
  }

  releaseOwner(ownerId: number): void {
    this.options.clawHub.releaseOwner(ownerId);
    this.options.skillsSh.releaseOwner(ownerId);
  }

  dispose(): void {
    this.options.httpClient.clearCache();
  }
}
