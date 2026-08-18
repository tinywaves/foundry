import type {
  SkillApplyUpdateResult,
  SkillSourceProvider,
  SkillSourceView,
  SkillUpdateCheckResult,
} from '../../../../shared/skill-contract';
import type { SkillStatePresentation } from './skill-inventory-model';

const providerLabels: Record<SkillSourceProvider, string> = {
  git: 'Git',
  clawhub: 'ClawHub',
};

const checkPresentations: Record<SkillSourceView['check']['status'], SkillStatePresentation> = {
  'never': { label: 'Not checked', variant: 'neutral' },
  'current': { label: 'Current', variant: 'success' },
  'update-available': { label: 'Update available', variant: 'accent' },
  'unavailable': { label: 'Unavailable', variant: 'warning' },
};

export function getSkillSourceProviderLabel(provider: SkillSourceProvider): string {
  return providerLabels[provider];
}

export function getSkillSourceStatusPresentation(
  source: SkillSourceView,
): SkillStatePresentation {
  return source.trackingMode === 'fixed'
    ? { label: 'Fixed', variant: 'neutral' }
    : checkPresentations[source.check.status];
}

export function getSkillSourceCheckedAt(source: SkillSourceView): number | null {
  return source.check.status === 'never' ? null : source.check.checkedAt;
}

export function getSkillSourceCandidateId(source: SkillSourceView): string | null {
  return source.check.status === 'update-available'
    ? source.check.candidate.id
    : null;
}

export function mergeSkillSourceChecks(
  current: readonly SkillSourceView[] | undefined,
  results: readonly SkillUpdateCheckResult[],
): SkillSourceView[] | undefined {
  if (current === undefined) {
    return undefined;
  }
  const checkedSources = new Map(results.map((result) => [result.source.id, result.source]));
  return current.map((source) => checkedSources.get(source.id) ?? source);
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
