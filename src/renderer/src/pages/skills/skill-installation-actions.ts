import type {
  SkillDistributionTargetResult,
  SkillInstallationView,
} from '../../../../shared/skill-contract';

export const skillInstallationActions = ['uninstall'] as const;

export type SkillInstallationAction = typeof skillInstallationActions[number];

export function getSkillInstallationActions(
  _installation: SkillInstallationView,
): SkillInstallationAction[] {
  return ['uninstall'];
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
