import type { ProviderSummary } from '../../../../shared/provider-contract';

export function canInitiateProviderDeletion(
  provider: Pick<ProviderSummary, 'isInUse'>,
): boolean {
  return !provider.isInUse;
}
