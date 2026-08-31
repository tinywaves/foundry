import { apiStatusCodes } from '@dhzh/foundry-api-contract';
import type { HealthResponse } from '@dhzh/foundry-api-contract';

export type ServiceConnection
  = | { state: 'connected'; message: string }
    | { state: 'unavailable'; message: string };

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;
  return response.status === apiStatusCodes.success
    && response.data === true
    && (response.message === undefined || typeof response.message === 'string');
}

export async function checkServiceHealth(
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ServiceConnection> {
  try {
    const response = await fetcher('/api/health', { signal });
    if (response.status !== 200) {
      return { state: 'unavailable', message: 'Unable to connect to service.' };
    }

    const body: unknown = await response.json();
    if (!isHealthResponse(body)) {
      return { state: 'unavailable', message: 'Unable to connect to service.' };
    }

    return {
      state: 'connected',
      message: body.message ?? 'Service is healthy.',
    };
  } catch {
    return { state: 'unavailable', message: 'Unable to connect to service.' };
  }
}
