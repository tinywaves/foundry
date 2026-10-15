import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

const healthQueryKey = ['health'] as const;
const healthTitleByStatus = {
  pending: 'Foundry · Checking…',
  success: 'Foundry · Healthy',
  error: 'Foundry · Unhealthy',
} as const;

export function useHealth(): void {
  const healthQuery = useQuery({
    queryKey: healthQueryKey,
    queryFn: async () => {
      const response = await fetch('/api/health', {
        cache: 'no-store',
      });

      if (response.status !== 200) {
        throw new Error('Health check failed');
      }

      return true;
    },
    networkMode: 'always',
    staleTime: 'static',
    gcTime: Infinity,
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  useEffect(() => {
    document.title = healthTitleByStatus[healthQuery.status];
  }, [healthQuery.status]);
}
