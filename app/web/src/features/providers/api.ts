import type {
  ProviderInput,
  ProviderSummary,
  RemoteModel,
} from './types';
import { requestJSON } from '../../lib/api';
import { formatRecordTimes } from '../../lib/format-time';
import { getCachedSettings } from '../settings/api';

export const providerKeys = {
  all: ['providers'] as const,
  list: () => [...providerKeys.all, 'list'] as const,
  detail: (id: string) => [...providerKeys.all, 'detail', id] as const,
};

export async function listProviders() {
  const [providers, settings] = await Promise.all([
    requestJSON<ProviderSummary[]>('/api/providers'),
    getCachedSettings(),
  ]);
  return providers.map((provider) => ({
    ...formatRecordTimes(provider, settings),
    apiKey: '',
    isInUse: false,
  }));
}

export async function saveProvider(input: ProviderInput, id?: string) {
  const [provider, settings] = await Promise.all([
    requestJSON<ProviderSummary>(
      id ? `/api/providers/${id}` : '/api/providers',
      {
        method: id ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      },
    ),
    getCachedSettings(),
  ]);
  return { ...formatRecordTimes(provider, settings), apiKey: '' };
}

export async function getProvider(id: string): Promise<ProviderSummary | null> {
  try {
    const [provider, settings] = await Promise.all([
      requestJSON<ProviderSummary>(`/api/providers/${id}`),
      getCachedSettings(),
    ]);
    return { ...formatRecordTimes(provider, settings), apiKey: '' };
  } catch {
    return null;
  }
}

export async function setProviderStatus(
  id: string,
  status: 'active' | 'disabled' | 'deleted',
) {
  const [provider, settings] = await Promise.all([
    requestJSON<ProviderSummary>(`/api/providers/${id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    }),
    getCachedSettings(),
  ]);
  return { ...formatRecordTimes(provider, settings), apiKey: '' };
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
