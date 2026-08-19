import type {
  SkillDistributionTargetResult,
  SkillInstallationView,
} from '../../../../shared/skill-contract';

export const skillInstallationActions = [
  'restore',
  'promote',
  'import-as-new',
  'uninstall',
] as const;

export type SkillInstallationAction = typeof skillInstallationActions[number];

export function getSkillInstallationActions(
  installation: SkillInstallationView,
): SkillInstallationAction[] {
  const canReadStore = installation.storeObservation.status === 'available';
  if (installation.targetObservation.status === 'missing') {
    return canReadStore ? ['restore', 'uninstall'] : ['uninstall'];
  }
  if (installation.targetObservation.status === 'unreadable') {
    return canReadStore ? ['restore'] : [];
  }
  if (!canReadStore) {
    return ['promote', 'import-as-new', 'uninstall'];
  }
  if (installation.syncStatus === 'synced') {
    return ['uninstall'];
  }
  return ['restore', 'promote', 'import-as-new', 'uninstall'];
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
