import type {
  SkillAddRemoteCandidateResult,
  SkillDiscoveryProvider,
  SkillRemoteDetailView,
  SkillRemoteResultView,
  SkillRemoteSearchInput,
  SkillRemoteVersionView,
  SkillResolveGitSourceInput,
} from '../../../../shared/skill-contract';

export type SkillDiscoverMode = 'git' | SkillDiscoveryProvider;

export interface SkillRemoteSearchState {
  generation: number;
  provider: SkillDiscoveryProvider;
  query: string;
  results: SkillRemoteResultView[];
}

export function normalizeRemoteQuery(value: string): string {
  return value.trim().replaceAll(/\s+/gu, ' ');
}

export function createRemoteSearchInput(
  provider: SkillDiscoveryProvider,
  value: string,
): SkillRemoteSearchInput | null {
  const query = normalizeRemoteQuery(value);
  return query === '' ? null : { provider, query };
}

export function createGitResolutionInput(
  sourceUrlValue: string,
  requestedRefValue: string,
): SkillResolveGitSourceInput | null {
  const sourceUrl = sourceUrlValue.trim();
  if (sourceUrl === '') {
    return null;
  }
  const requestedRef = requestedRefValue.trim();
  return {
    sourceUrl,
    requestedRef: requestedRef === '' ? null : requestedRef,
  };
}

export function replaceRemoteSearchResults(
  previous: SkillRemoteSearchState | null,
  input: SkillRemoteSearchInput,
  results: SkillRemoteResultView[],
): SkillRemoteSearchState {
  return {
    generation: (previous?.generation ?? 0) + 1,
    provider: input.provider,
    query: input.query,
    results,
  };
}

export function findCurrentRemoteResult(
  state: SkillRemoteSearchState | null,
  resultId: string,
  generation: number,
): SkillRemoteResultView | null {
  if (state?.generation !== generation) {
    return null;
  }
  return state.results.find((result) => result.id === resultId) ?? null;
}

export function chooseRemoteVersion(
  details: SkillRemoteDetailView,
  selectedId: string | null,
): SkillRemoteVersionView | null {
  if (selectedId !== null) {
    const selected = details.versions.find((version) => version.id === selectedId);
    if (selected) {
      return selected;
    }
  }
  const recommended = details.recommendedVersionId === null
    ? null
    : details.versions.find((version) => version.id === details.recommendedVersionId);
  return recommended ?? (details.versions.length > 0 ? details.versions[0] : null);
}

export function describeRemoteAddOutcome(result: SkillAddRemoteCandidateResult): {
  title: string;
  message: string;
} {
  return result.reusedPackage
    ? {
        title: 'Source Added to Existing Skill',
        message: `${result.skillPackage.distributionName} already had identical content.`,
      }
    : {
        title: 'Skill Added to Store',
        message: `${result.skillPackage.distributionName} is now available in Store.`,
      };
}

export function describeRemoteFailure(error: {
  message: string;
  apiError?: { code: string; retryAfterSeconds?: number };
}): string {
  const retryAfter = error.apiError?.retryAfterSeconds;
  if (error.apiError?.code === 'rate-limited' && retryAfter !== undefined) {
    return `${error.message} Retry in ${retryAfter} seconds.`;
  }
  if (error.apiError?.code === 'stale-result') {
    return `${error.message} The previous result is no longer usable.`;
  }
  return error.message;
}
