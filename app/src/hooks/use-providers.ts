import type {
  CreateProviderRequest,
  ProviderResponse,
  ProviderRuntime,
  ProviderSummary,
  ProvidersResponse,
} from '@dhzh/foundry-api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function providersQueryKey(runtime: ProviderRuntime) {
  return ['providers', runtime] as const;
}

async function readProvidersResponse(response: Response): Promise<ProviderSummary[]> {
  if (!response.ok) {
    throw new Error('The Foundry Server could not load Providers.');
  }

  const result = await response.json() as ProvidersResponse;
  return result.data;
}

async function listProviders(runtime: ProviderRuntime): Promise<ProviderSummary[]> {
  return readProvidersResponse(await fetch(
    `/api/providers?runtime=${encodeURIComponent(runtime)}`,
    { cache: 'no-store' },
  ));
}

async function createProvider(input: CreateProviderRequest): Promise<ProviderSummary> {
  const response = await fetch('/api/providers', {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('The Foundry Server could not create the Provider.');
  }

  const result = await response.json() as ProviderResponse;
  return result.data;
}

export function useProviders(runtime: ProviderRuntime) {
  return useQuery({
    queryKey: providersQueryKey(runtime),
    queryFn: () => listProviders(runtime),
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProvider,
    onSuccess: (provider) => {
      queryClient.setQueryData<ProviderSummary[]>(
        providersQueryKey(provider.runtime),
        (providers) => [provider, ...(providers ?? [])],
      );
    },
  });
}
