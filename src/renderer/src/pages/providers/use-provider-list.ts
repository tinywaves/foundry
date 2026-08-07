import { useQuery } from '@tanstack/react-query';
import type { ProviderRuntime } from '../../../../shared/provider-contract';
import { getProviderListQueryOptions } from './provider-query';

export function useProviderList(runtime: ProviderRuntime) {
  const query = useQuery(getProviderListQueryOptions(runtime));

  let state;
  if (query.isPending) {
    state = { status: 'loading' as const };
  } else if (query.isError) {
    state = { status: 'error' as const, message: query.error.message };
  } else {
    state = { status: 'success' as const, providers: query.data };
  }

  return { state };
}
