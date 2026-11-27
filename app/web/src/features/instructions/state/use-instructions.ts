import { useQuery } from '@tanstack/react-query';

import { listInstructions } from '../api';

export const instructionsQueryKey = ['instructions'] as const;

export function useInstructions() {
  const query = useQuery({
    queryKey: instructionsQueryKey,
    queryFn: ({ signal }) => listInstructions(signal),
    retry: false,
  });

  return {
    instructions: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError && query.data === undefined,
    retry: query.refetch,
  };
}
