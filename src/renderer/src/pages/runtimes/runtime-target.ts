import type {
  ProviderRuntime,
  ProviderSummary,
} from '../../../../shared/provider-contract';
import type { RuntimeSummary, RuntimeConfigurationTarget } from '../../../../shared/runtime-contract';

export const OFFICIAL_DEFAULT_TARGET = 'official-default';

export type RuntimeTargetValue = string;
export type RuntimeDraftTargets = Partial<Record<ProviderRuntime, RuntimeTargetValue>>;

export interface RuntimeTargetOption {
  value: RuntimeTargetValue;
  label: string;
}

export function getPersistedRuntimeTarget(
  runtime: RuntimeSummary,
): RuntimeTargetValue | undefined {
  switch (runtime.status) {
    case 'not-managed': {
      return undefined;
    }
    case 'provider': {
      return runtime.providerId;
    }
    case 'official-default': {
      return OFFICIAL_DEFAULT_TARGET;
    }
  }
}

export function getEffectiveRuntimeTarget(
  runtime: RuntimeSummary,
  draftTargets: RuntimeDraftTargets,
): RuntimeTargetValue | undefined {
  return draftTargets[runtime.runtime] ?? getPersistedRuntimeTarget(runtime);
}

export function getRuntimeConfigurationTarget(
  value: RuntimeTargetValue,
): RuntimeConfigurationTarget {
  return value === OFFICIAL_DEFAULT_TARGET
    ? { kind: 'official-default' }
    : { kind: 'provider', providerId: value };
}

export function hasRuntimeTargetChange(
  runtime: RuntimeSummary,
  target: RuntimeTargetValue | undefined,
): target is RuntimeTargetValue {
  return target !== undefined && target !== getPersistedRuntimeTarget(runtime);
}

export function withRuntimeDraftTarget(
  draftTargets: RuntimeDraftTargets,
  runtime: ProviderRuntime,
  target: RuntimeTargetValue,
): RuntimeDraftTargets {
  return { ...draftTargets, [runtime]: target };
}

export function withoutRuntimeDraftTarget(
  draftTargets: RuntimeDraftTargets,
  runtime: ProviderRuntime,
): RuntimeDraftTargets {
  const next = { ...draftTargets };
  delete next[runtime];
  return next;
}

export function getRuntimeProviders(
  runtime: ProviderRuntime,
  providers: ProviderSummary[],
): ProviderSummary[] {
  return providers.filter((provider) => (
    provider.runtime === runtime && provider.source === 'user-custom'
  ));
}

export function getRuntimeTargetOptions(
  runtime: ProviderRuntime,
  providers: ProviderSummary[],
): RuntimeTargetOption[] {
  return [
    { value: OFFICIAL_DEFAULT_TARGET, label: 'Official Default' },
    ...getRuntimeProviders(runtime, providers).map((provider) => ({
      value: provider.id,
      label: provider.name,
    })),
  ];
}

export function isAvailableRuntimeTarget(
  value: string,
  providersById: ReadonlyMap<string, ProviderSummary>,
): boolean {
  return value === OFFICIAL_DEFAULT_TARGET || providersById.has(value);
}
