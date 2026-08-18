import type {
  SkillContentObservationStatus,
  SkillInstallationStateResult,
  SkillInstallationView,
  SkillStorePackageView,
  SkillTargetView,
} from '../../../../shared/skill-contract';

export interface SkillStatePresentation {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'accent' | 'neutral';
}

export interface SkillTargetInventoryRow {
  target: SkillTargetView;
  installations: SkillInstallationView[];
  packageCount: number;
  stateCounts: Record<string, number>;
}

const observationPresentations: Record<
  SkillContentObservationStatus,
  SkillStatePresentation
> = {
  available: { label: 'Available', variant: 'success' },
  missing: { label: 'Missing', variant: 'error' },
  unreadable: { label: 'Unreadable', variant: 'warning' },
};

const installationPresentations: Record<string, SkillStatePresentation> = {
  'synced': { label: 'Synced', variant: 'success' },
  'outdated': { label: 'Outdated', variant: 'accent' },
  'drifted': { label: 'Drifted', variant: 'warning' },
  'diverged': { label: 'Diverged', variant: 'warning' },
  'missing': { label: 'Missing', variant: 'error' },
  'distribution-baseline-missing': { label: 'Baseline unavailable', variant: 'neutral' },
  'store-missing': { label: 'Store missing', variant: 'error' },
  'store-unreadable': { label: 'Store unreadable', variant: 'warning' },
  'target-unreadable': { label: 'Target unreadable', variant: 'warning' },
};

export function filterSkillStorePackages(
  packages: readonly SkillStorePackageView[],
  search: string,
): SkillStorePackageView[] {
  const query = search.trim().toLocaleLowerCase();
  if (!query) {
    return [...packages];
  }
  return packages.filter((skillPackage) => (
    skillPackage.distributionName.toLocaleLowerCase().includes(query)
  ));
}

export function getStoreObservationPresentation(
  status: SkillContentObservationStatus,
): SkillStatePresentation {
  return observationPresentations[status];
}

export function getInstallationStatePresentation(
  state: SkillInstallationStateResult,
): SkillStatePresentation {
  return installationPresentations[state.kind === 'known' ? state.state : state.reason];
}

export function orderSkillTargets(targets: readonly SkillTargetView[]): SkillTargetView[] {
  return [...targets].toSorted((left, right) => {
    const isLeftLegacy = left.kind === 'codex-legacy';
    const isRightLegacy = right.kind === 'codex-legacy';
    if (isLeftLegacy !== isRightLegacy) {
      return isLeftLegacy ? 1 : -1;
    }
    return left.sortOrder - right.sortOrder
      || left.displayName.localeCompare(right.displayName)
      || left.id.localeCompare(right.id);
  });
}

export function buildSkillTargetInventory(
  targets: readonly SkillTargetView[],
  installations: readonly SkillInstallationView[],
): SkillTargetInventoryRow[] {
  return orderSkillTargets(targets).map((target) => {
    const targetInstallations = installations
      .filter((item) => item.targetId === target.id)
      .toSorted((left, right) => (
        left.distributionName.localeCompare(right.distributionName)
        || left.id.localeCompare(right.id)
      ));
    const stateCounts: Record<string, number> = {};
    for (const installation of targetInstallations) {
      const presentation = getInstallationStatePresentation(installation.state);
      stateCounts[presentation.label] = (stateCounts[presentation.label] ?? 0) + 1;
    }
    return {
      target,
      installations: targetInstallations,
      packageCount: new Set(targetInstallations.map((item) => item.packageId)).size,
      stateCounts,
    };
  });
}

export function isCodexLegacyTarget(target: SkillTargetView): boolean {
  return target.kind === 'codex-legacy'
    && target.hint === 'Legacy'
    && target.documentationUrl !== null;
}
