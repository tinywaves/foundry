import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type {
  ProviderApiError,
  ProviderApiResult,
  ProviderAvatar,
  ProviderDetail,
  ProviderRuntime,
  ProviderSummary,
} from '../../../../shared/provider-contract';

export const PROVIDER_AVATAR_GC_TIME = 5 * 60 * 1000;

export const providerQueryKeys = {
  all: ['providers'] as const,
  lists: () => [...providerQueryKeys.all, 'list'] as const,
  list: (runtime: ProviderRuntime) => [...providerQueryKeys.lists(), runtime] as const,
  avatars: (runtime: ProviderRuntime) => (
    [...providerQueryKeys.all, 'avatar', runtime] as const
  ),
  avatar: (runtime: ProviderRuntime, id: string) => (
    [...providerQueryKeys.avatars(runtime), id] as const
  ),
  details: () => [...providerQueryKeys.all, 'detail'] as const,
  detail: (runtime: ProviderRuntime, id: string) => (
    [...providerQueryKeys.details(), runtime, id] as const
  ),
};

export function getSavedProviderTestMutationKey(
  provider: Pick<ProviderSummary, 'id' | 'runtime'>,
) {
  return [...providerQueryKeys.all, 'test-saved', provider.runtime, provider.id] as const;
}

export class ProviderRequestError extends Error {
  readonly apiError: ProviderApiError | undefined;

  constructor(message: string, apiError?: ProviderApiError) {
    super(message);
    this.name = 'ProviderRequestError';
    this.apiError = apiError;
  }
}

export function isMatchingCustomProvider(
  provider: ProviderSummary,
  runtime: ProviderRuntime,
  id?: string,
): boolean {
  return provider.runtime === runtime
    && provider.source === 'user-custom'
    && (id === undefined || provider.id === id);
}

export async function resolveProviderRequest<T>(
  request: () => Promise<ProviderApiResult<T>>,
  fallbackMessage: string,
): Promise<T> {
  try {
    const result = await request();
    if (!result.ok) {
      throw new ProviderRequestError(result.error.message, result.error);
    }
    return result.value;
  } catch (error) {
    if (error instanceof ProviderRequestError) {
      throw error;
    }
    throw new ProviderRequestError(fallbackMessage);
  }
}

export function getProviderListQueryOptions(runtime: ProviderRuntime) {
  return queryOptions({
    queryKey: providerQueryKeys.list(runtime),
    queryFn: async () => {
      const providers = await resolveProviderRequest<ProviderSummary[]>(
        () => globalThis.api.providers.listProviders(runtime),
        'Provider data could not be loaded.',
      );
      return providers.filter((provider) => isMatchingCustomProvider(provider, runtime));
    },
    gcTime: Infinity,
    refetchOnMount: false,
    retryOnMount: false,
    staleTime: Infinity,
  });
}

export function getProviderAvatarQueryOptions(runtime: ProviderRuntime, id: string) {
  return queryOptions({
    queryKey: providerQueryKeys.avatar(runtime, id),
    queryFn: () => resolveProviderRequest<ProviderAvatar | null>(
      () => globalThis.api.providers.getProviderAvatar(id),
      'Provider avatar could not be loaded.',
    ),
    gcTime: PROVIDER_AVATAR_GC_TIME,
    refetchOnMount: false,
    retryOnMount: false,
    staleTime: Infinity,
  });
}

export function getProviderDetailQueryOptions(provider: ProviderSummary) {
  return queryOptions({
    queryKey: providerQueryKeys.detail(provider.runtime, provider.id),
    queryFn: async (): Promise<ProviderDetail> => {
      const detail = await resolveProviderRequest<ProviderDetail>(
        () => globalThis.api.providers.getProviderForEdit(provider.id),
        'Provider details could not be loaded.',
      );
      if (
        !isMatchingCustomProvider(detail, provider.runtime, provider.id)
      ) {
        throw new ProviderRequestError('The selected Provider detail did not match this row.');
      }
      return detail;
    },
    gcTime: 0,
    refetchOnMount: false,
    retryOnMount: false,
    staleTime: Infinity,
  });
}

export function replaceCachedProvider(
  queryClient: QueryClient,
  runtime: ProviderRuntime,
  provider: ProviderSummary,
): void {
  if (!isMatchingCustomProvider(provider, runtime)) {
    return;
  }
  queryClient.setQueryData<ProviderSummary[]>(
    providerQueryKeys.list(runtime),
    (providers) => {
      if (providers === undefined) {
        return providers;
      }
      const providerIndex = providers.findIndex((item) => item.id === provider.id);
      if (providerIndex === -1) {
        return providers;
      }
      return providers.map((item) => (
        item.id === provider.id ? provider : item
      ));
    },
  );
}

export function resetProviderList(
  queryClient: QueryClient,
  runtime: ProviderRuntime,
): Promise<void> {
  const reset = queryClient.resetQueries({
    exact: true,
    queryKey: providerQueryKeys.list(runtime),
  });
  queryClient.removeQueries({ queryKey: providerQueryKeys.avatars(runtime) });
  return reset;
}

export async function resetProviderDetail(
  queryClient: QueryClient,
  provider: ProviderSummary,
): Promise<void> {
  const resets = [
    queryClient.resetQueries({
      exact: true,
      queryKey: providerQueryKeys.detail(provider.runtime, provider.id),
    }),
  ];
  if (provider.hasCustomAvatar) {
    resets.push(queryClient.resetQueries({
      exact: true,
      queryKey: providerQueryKeys.avatar(provider.runtime, provider.id),
    }));
  }
  await Promise.all(resets);
}

export function removeProviderDetail(
  queryClient: QueryClient,
  runtime: ProviderRuntime,
  id: string,
): void {
  const queryKey = providerQueryKeys.detail(runtime, id);
  void queryClient.cancelQueries({ exact: true, queryKey });
  queryClient.removeQueries({ exact: true, queryKey });
}
