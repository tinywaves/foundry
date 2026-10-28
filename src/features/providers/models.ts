import type { ProviderConnection, RemoteModel } from './contracts';

const MODEL_REQUEST_TIMEOUT_MS = 15_000;

export class ProviderModelsError extends Error {
  readonly code = 'PROVIDER_MODELS_FAILED';

  constructor(message: string) {
    super(message);
    this.name = 'ProviderModelsError';
  }
}

export async function fetchProviderModels(
  connection: ProviderConnection,
  fetchImplementation: typeof fetch = fetch,
): Promise<RemoteModel[]> {
  const headers: Record<string, string> = {
    accept: 'application/json',
  };

  if (connection.protocol === 'anthropic-messages') {
    headers['anthropic-version'] = '2023-06-01';
    if (connection.apiKey) {
      headers['x-api-key'] = connection.apiKey;
    }
  } else {
    headers.authorization = `Bearer ${connection.apiKey || 'local-provider'}`;
  }

  let response: Response;
  try {
    response = await fetchImplementation(buildModelsURL(connection.baseURL), {
      headers,
      signal: AbortSignal.timeout(MODEL_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    throw new ProviderModelsError(`Unable to reach provider: ${message}`);
  }

  if (!response.ok) {
    throw new ProviderModelsError(`Provider returned HTTP ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ProviderModelsError('Provider returned invalid JSON');
  }

  return parseModelsResponse(payload);
}

function buildModelsURL(baseURL: string): string {
  return new URL(`models${baseURL.endsWith('/') ? '' : '/'}`, baseURL).href;
}

function parseModelsResponse(value: unknown): RemoteModel[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new ProviderModelsError('Provider response does not contain a model list');
  }

  return value.data.map((model) => {
    if (!isRecord(model) || typeof model.id !== 'string' || model.id.length === 0) {
      throw new ProviderModelsError('Provider returned an invalid model entry');
    }

    const displayName = readDisplayName(model);

    return displayName ? { id: model.id, displayName } : { id: model.id };
  });
}

function readDisplayName(model: Record<string, unknown>): string | undefined {
  if (typeof model.display_name === 'string') {
    return model.display_name;
  }

  return typeof model.name === 'string' ? model.name : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
