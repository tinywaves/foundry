import type { ProviderInput } from '../../shared/providers';

export const providerKeys = {
  all: ['providers'] as const,
  list: () => [...providerKeys.all, 'list'] as const,
  detail: (id: string) => [...providerKeys.all, 'detail', id] as const,
};

export function listProviders() {
  return globalThis.api.providers.list();
}

export function saveProvider(input: ProviderInput, id?: string) {
  return globalThis.api.providers.save(input, id);
}
