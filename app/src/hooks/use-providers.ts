import type {
  CreateProviderRequest,
  Provider,
  ProviderCopyResponse,
  ProviderConnectionTestResponse,
  ProviderDeleteResponse,
  ProviderDetailResponse,
  ProviderResponse,
  ProviderRuntime,
  ProviderSummary,
  ProvidersResponse,
  ProviderUpdateResponse,
} from '@dhzh/foundry-api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function providersQueryKey(runtime: ProviderRuntime) {
  return ['providers', runtime] as const;
}

function providerQueryKey(providerId: string) {
  return ['provider', providerId] as const;
}

async function readProviderDetailResponse(response: Response): Promise<Provider> {
  if (!response.ok) {
    throw new Error('The Foundry Server could not load the Provider.');
  }

  const result = await response.json() as ProviderDetailResponse;
  if (result.status !== 'SUCCESS' || result.data === null) {
    throw new Error(result.message ?? 'The Provider could not be found.');
  }
  return result.data;
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

async function getProvider(providerId: string): Promise<Provider> {
  return readProviderDetailResponse(await fetch(
    `/api/providers/${encodeURIComponent(providerId)}`,
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

async function updateProvider(
  providerId: string,
  input: CreateProviderRequest,
): Promise<ProviderSummary> {
  const response = await fetch(`/api/providers/${encodeURIComponent(providerId)}`, {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  });
  if (!response.ok) {
    throw new Error('The Foundry Server could not update the Provider.');
  }

  const result = await response.json() as ProviderUpdateResponse;
  if (result.status !== 'SUCCESS' || result.data === null) {
    throw new Error(result.message ?? 'The Provider could not be updated.');
  }
  return result.data;
}

async function copyProvider(
  providerId: string,
  input: CreateProviderRequest,
): Promise<ProviderSummary> {
  const response = await fetch(`/api/providers/${encodeURIComponent(providerId)}/copy`, {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('The Foundry Server could not copy the Provider.');
  }

  const result = await response.json() as ProviderCopyResponse;
  if (result.status !== 'SUCCESS' || result.data === null) {
    throw new Error(result.message ?? 'The Provider could not be copied.');
  }
  return result.data;
}

async function deleteProvider(providerId: string): Promise<void> {
  const response = await fetch(`/api/providers/${encodeURIComponent(providerId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('The Foundry Server could not delete the Provider.');
  }

  const result = await response.json() as ProviderDeleteResponse;
  if (result.status !== 'SUCCESS' || !result.data) {
    throw new Error(result.message ?? 'The Provider could not be deleted.');
  }
}

async function testProviderConnection(providerId: string): Promise<void> {
  const response = await fetch(
    `/api/providers/${encodeURIComponent(providerId)}/test-connection`,
    { method: 'POST' },
  );
  if (!response.ok) {
    throw new Error('The Foundry Server could not test the Provider connection.');
  }

  const result = await response.json() as ProviderConnectionTestResponse;
  if (result.status !== 'SUCCESS' || !result.data) {
    throw new Error(result.message ?? 'The Provider connection test failed.');
  }
}

export function useProviders(runtime: ProviderRuntime) {
  return useQuery({
    queryKey: providersQueryKey(runtime),
    queryFn: () => listProviders(runtime),
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useProvider(providerId: string) {
  return useQuery({
    queryKey: providerQueryKey(providerId),
    queryFn: () => getProvider(providerId),
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

export function useCopyProvider(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProviderRequest) => copyProvider(providerId, input),
    onSuccess: (provider) => {
      queryClient.setQueryData<ProviderSummary[]>(
        providersQueryKey(provider.runtime),
        (providers) => (providers ? [provider, ...providers] : [provider]),
      );
    },
  });
}

export function useDeleteProvider(provider: ProviderSummary) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteProvider(provider.id),
    onSuccess: () => {
      queryClient.removeQueries({
        exact: true,
        queryKey: providerQueryKey(provider.id),
      });
      queryClient.setQueryData<ProviderSummary[]>(
        providersQueryKey(provider.runtime),
        (providers) => providers?.filter((summary) => summary.id !== provider.id),
      );
    },
  });
}

export function useTestProviderConnection(providerId: string) {
  return useMutation({
    mutationFn: () => testProviderConnection(providerId),
  });
}

export function useUpdateProvider(providerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProviderRequest) => updateProvider(providerId, input),
    onSuccess: (provider) => {
      queryClient.removeQueries({
        exact: true,
        queryKey: providerQueryKey(provider.id),
      });
      queryClient.setQueryData<ProviderSummary[]>(
        providersQueryKey(provider.runtime),
        (providers) => providers?.map((summary) => (
          summary.id === provider.id ? provider : summary
        )),
      );
    },
  });
}
