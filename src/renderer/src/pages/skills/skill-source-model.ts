import type {
  SkillApplyUpdateResult,
  SkillSourceProvider,
  SkillSourceView,
  SkillUpdateCandidateView,
  SkillUpdateCheckResult,
} from '../../../../shared/skill-contract';
import type { SkillStatePresentation } from './skill-inventory-model';

const providerLabels: Record<SkillSourceProvider, string> = {
  git: 'Git',
  clawhub: 'ClawHub',
};

const checkPresentations: Record<SkillUpdateCheckResult['status'], SkillStatePresentation> = {
  'fixed': { label: 'Fixed', variant: 'neutral' },
  'current': { label: 'Current', variant: 'success' },
  'update-available': { label: 'Update available', variant: 'accent' },
  'unavailable': { label: 'Unavailable', variant: 'warning' },
};

export function getSkillSourceProviderLabel(provider: SkillSourceProvider): string {
  return providerLabels[provider];
}

export function getSkillSourceStatusPresentation(
  source: SkillSourceView,
  check: SkillUpdateCheckResult | undefined,
): SkillStatePresentation {
  if (check) {
    return checkPresentations[check.status];
  }
  return source.trackingMode === 'fixed'
    ? checkPresentations.fixed
    : { label: 'Not checked', variant: 'neutral' };
}

export function getSkillSourceCandidate(
  check: SkillUpdateCheckResult | undefined,
): SkillUpdateCandidateView | null {
  return check?.status === 'update-available' ? check.candidate : null;
}

export function mergeSkillSourceCheckResults(
  current: ReadonlyMap<string, SkillUpdateCheckResult>,
  results: readonly SkillUpdateCheckResult[],
): Map<string, SkillUpdateCheckResult> {
  const merged = new Map(current);
  for (const result of results) {
    merged.set(result.source.id, result);
  }
  return merged;
}

export function describeSkillSourceChecks(results: readonly SkillUpdateCheckResult[]): string {
  const updateCount = results.filter((result) => result.status === 'update-available').length;
  if (updateCount > 0) {
    return `${updateCount} update${updateCount === 1 ? '' : 's'} available.`;
  }
  const unavailableCount = results.filter((result) => result.status === 'unavailable').length;
  if (unavailableCount > 0) {
    return `${unavailableCount} Source${unavailableCount === 1 ? ' is' : 's are'} unavailable.`;
  }
  return 'Tracked Sources are current.';
}

export function describeSkillUpdateResult(
  result: Pick<SkillApplyUpdateResult, 'contentChanged'>,
): string {
  return result.contentChanged
    ? 'Store updated. Existing installations were left unchanged.'
    : 'Source revision updated; Store content was already current.';
}
