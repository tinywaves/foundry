import type {
  SkillContentObservationStatus,
  SkillInstallationSyncStatus,
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

const observationPresentations: Record<
  SkillContentObservationStatus,
  SkillStatePresentation
> = {
  available: { label: 'Available', variant: 'success' },
  missing: { label: 'Missing', variant: 'error' },
  unreadable: { label: 'Unreadable', variant: 'warning' },
};

const syncPresentations: Record<SkillInstallationSyncStatus, SkillStatePresentation> = {
  synced: { label: 'Synced', variant: 'success' },
  different: { label: 'Different', variant: 'warning' },
  unknown: { label: 'Unknown', variant: 'neutral' },
};

const unavailableStorePresentations = {
  'store-missing': { label: 'Store missing', variant: 'error' },
  'store-unreadable': { label: 'Store unreadable', variant: 'warning' },
} satisfies Record<string, SkillStatePresentation>;

const missingInstallationPresentation: SkillStatePresentation = {
  label: 'Missing',
  variant: 'error',
};

const unreadableInstallationPresentation: SkillStatePresentation = {
  label: 'Unreadable',
  variant: 'warning',
};

const targetInstallationPresentations: Record<
  SkillContentObservationStatus,
  SkillStatePresentation
> = {
  available: { label: 'Installed', variant: 'success' },
  missing: { label: 'Missing', variant: 'error' },
  unreadable: { label: 'Unreadable', variant: 'warning' },
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

export function getStoreObservationPresentation(
  status: SkillContentObservationStatus,
): SkillStatePresentation {
  return observationPresentations[status];
}

export function getInstallationStatusPresentation(
  installation: SkillInstallationView,
): SkillStatePresentation {
  if (installation.targetObservation.status === 'missing') {
    return missingInstallationPresentation;
  }
  if (installation.targetObservation.status === 'unreadable') {
    return unreadableInstallationPresentation;
  }
  if (installation.storeObservation.status !== 'available') {
    return unavailableStorePresentations[`store-${installation.storeObservation.status}`];
  }
  return syncPresentations[installation.syncStatus];
}

export function getTargetInstallationPresentation(
  installation: SkillInstallationView | undefined,
): SkillStatePresentation {
  return installation
    ? targetInstallationPresentations[installation.targetObservation.status]
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
