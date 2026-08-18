import type {
  SkillDistributionTargetResult,
  SkillInstallationStateResult,
} from '../../../../shared/skill-contract';

export const skillInstallationActions = [
  'restore',
  'promote',
  'import-as-new',
  'uninstall',
] as const;

export type SkillInstallationAction = typeof skillInstallationActions[number];

export function getSkillInstallationActions(
  state: SkillInstallationStateResult,
): SkillInstallationAction[] {
  if (state.kind === 'unavailable') {
    if (state.reason === 'store-missing' || state.reason === 'store-unreadable') {
      return ['promote', 'import-as-new', 'uninstall'];
    }
    if (state.reason === 'distribution-baseline-missing') {
      return ['restore', 'promote', 'import-as-new', 'uninstall'];
    }
    return [];
  }
  switch (state.state) {
    case 'synced': {
      return ['uninstall'];
    }
    case 'outdated':
    case 'missing': {
      return ['restore', 'uninstall'];
    }
    case 'drifted':
    case 'diverged': {
      return ['restore', 'promote', 'import-as-new', 'uninstall'];
    }
  }
}

export interface SkillDistributionResultSummary {
  succeeded: number;
  failed: number;
  isPartial: boolean;
}

export function summarizeSkillDistributionResults(
  results: readonly SkillDistributionTargetResult[],
): SkillDistributionResultSummary {
  const succeeded = results.filter((result) => result.ok).length;
  const failed = results.length - succeeded;
  return { succeeded, failed, isPartial: succeeded > 0 && failed > 0 };
}
