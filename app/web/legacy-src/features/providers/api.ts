import type {
  ProviderInput,
  ProviderListItem,
  ProviderSummary,
  RemoteModel,
} from './types';
import { requestJSON } from '../../lib/api';

export const providerKeys = {
  all: ['providers'] as const,
  list: () => [...providerKeys.all, 'list'] as const,
  detail: (id: string) => [...providerKeys.all, 'detail', id] as const,
};

export async function listProviders() {
  const providers = await requestJSON<ProviderListItem[]>('/api/providers');
  return providers;
}

export async function saveProvider(input: ProviderInput, id?: string) {
  const provider = await requestJSON<ProviderSummary>(
      id ? `/api/providers/${id}` : '/api/providers',
      {
        method: id ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      },
    );
  return provider;
}

export async function getProvider(id: string): Promise<ProviderSummary | null> {
  try {
    const provider = await requestJSON<ProviderSummary>(`/api/providers/${id}`);
    return provider;
  } catch {
    return null;
  }
}

export async function setProviderStatus(
  id: string,
  status: 'active' | 'disabled' | 'deleted',
) {
  const provider = await requestJSON<ProviderSummary>(`/api/providers/${id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  return provider;
}

export function fetchProviderModels(id: string): Promise<RemoteModel[]> {
  return requestJSON<RemoteModel[]>(`/api/providers/${id}/models`);
}

export function fetchModelsForInput(
  input: Pick<ProviderInput, 'protocol' | 'baseURL' | 'apiKey'>,
): Promise<RemoteModel[]> {
  return requestJSON<RemoteModel[]>('/api/providers/models', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}
