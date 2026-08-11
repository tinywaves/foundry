import { useQuery } from '@tanstack/react-query';
import { getRuntimeListQueryOptions } from './runtime-query';

export function useRuntimeList() {
  const query = useQuery(getRuntimeListQueryOptions());

  let state;
  if (query.isPending) {
    state = { status: 'loading' as const };
  } else if (query.isError) {
    state = { status: 'error' as const, message: query.error.message };
  } else {
    state = { status: 'success' as const, runtimes: query.data };
  }

  return { state };
}
