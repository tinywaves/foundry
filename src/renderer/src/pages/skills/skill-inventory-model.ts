import type {
  SkillInstallationDistributionStatus,
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
  statusCounts: Record<string, number>;
}

const distributionPresentations: Record<
  SkillInstallationDistributionStatus,
  SkillStatePresentation
> = {
  'current': { label: 'Current', variant: 'success' },
  'needs-distribution': { label: 'Needs distribution', variant: 'warning' },
};

const notInstalledPresentation: SkillStatePresentation = {
  label: 'Not installed',
  variant: 'neutral',
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

export function getInstallationStatusPresentation(
  installation: SkillInstallationView,
): SkillStatePresentation {
  return distributionPresentations[installation.distributionStatus];
}

export function getTargetInstallationPresentation(
  installation: SkillInstallationView | undefined,
): SkillStatePresentation {
  return installation
    ? getInstallationStatusPresentation(installation)
    : notInstalledPresentation;
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
    const statusCounts: Record<string, number> = {};
    for (const installation of targetInstallations) {
      const presentation = getInstallationStatusPresentation(installation);
      statusCounts[presentation.label] = (statusCounts[presentation.label] ?? 0) + 1;
    }
    return {
      target,
      installations: targetInstallations,
      packageCount: new Set(targetInstallations.map((item) => item.packageId)).size,
      statusCounts,
    };
  });
}

export function isCodexLegacyTarget(target: SkillTargetView): boolean {
  return target.kind === 'codex-legacy'
    && target.hint === 'Legacy'
    && target.documentationUrl !== null;
}
