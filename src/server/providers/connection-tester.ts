import type { Provider } from '@dhzh/foundry-api-contract';

const DEFAULT_TIMEOUT_MS = 10_000;
const unsupportedRouteStatuses = new Set([404, 405, 501]);

export type ProviderConnectionTestResult
  = | { successful: true }
    | { message: string; successful: false };

export interface ProviderConnectionTester {
  testProvider: (provider: Provider) => Promise<ProviderConnectionTestResult>;
}

type Fetcher = typeof fetch;
type RequestResult
  = | { response: Response; type: 'response' }
    | { error: unknown; type: 'error' };

function appendPath(baseUrl: string, path: string): string {
  const url = new URL(baseUrl);
  const basePath = url.pathname.replace(/\/+$/u, '');
  url.pathname = `${basePath}/${path}`;
  return url.href;
}

function createModelsUrl(provider: Provider): string {
  if (provider.runtime === 'codex') {
    return appendPath(provider.configuration.baseUrl, 'models');
  }

  const url = new URL(provider.configuration.baseUrl);
  const normalizedPath = url.pathname.replace(/\/+$/u, '');
  return appendPath(
    provider.configuration.baseUrl,
    normalizedPath.endsWith('/v1') ? 'models' : 'v1/models',
  );
}

function createHeaders(provider: Provider): Headers {
  const headers = new Headers({ accept: 'application/json' });
  if (provider.runtime === 'codex') {
    const { apiKey } = provider.configuration;
    if (apiKey !== null) {
      headers.set('authorization', `Bearer ${apiKey}`);
    }
    return headers;
  }

  const { apiKey } = provider.configuration;
  headers.set('anthropic-version', '2023-06-01');
  headers.set(
    provider.configuration.apiKeyHeader,
    provider.configuration.apiKeyHeader === 'authorization'
      ? `Bearer ${apiKey}`
      : apiKey,
  );
  return headers;
}

function defaultHttpMessage(status: number): string {
  if (status >= 300 && status < 400) {
    return 'The Provider redirected the request. Check the Base URL.';
  }
  if (status === 401 || status === 403) {
    return 'Authentication failed. Check the API key and its permissions.';
  }
  if (status === 402) {
    return 'The Provider rejected the request because billing is unavailable.';
  }
  if (status === 408) {
    return 'The Provider timed out while handling the request.';
  }
  if (status === 429) {
    return 'The Provider is rate limited or has insufficient quota.';
  }
  if (status >= 500) {
    return 'The Provider is temporarily unavailable.';
  }
  return `The Provider returned HTTP ${status}.`;
}

async function createHttpFailure(
  response: Response,
): Promise<ProviderConnectionTestResult> {
  await response.body?.cancel();
  return {
    message: defaultHttpMessage(response.status),
    successful: false,
  };
}

function createNetworkFailure(error: unknown): ProviderConnectionTestResult {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return { message: 'The connection timed out.', successful: false };
  }
  const detail = error instanceof Error ? `: ${error.message}` : '';
  return {
    message: `The Provider could not be reached${detail}.`.slice(0, 500),
    successful: false,
  };
}

export class HttpProviderConnectionTester implements ProviderConnectionTester {
  constructor(
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  private async request(url: string, headers: Headers): Promise<RequestResult> {
    try {
      return {
        response: await this.fetcher(url, {
          headers,
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(this.timeoutMs),
        }),
        type: 'response',
      };
    } catch (error) {
      return { error, type: 'error' };
    }
  }

  async testProvider(provider: Provider): Promise<ProviderConnectionTestResult> {
    const headers = createHeaders(provider);
    const modelsResult = await this.request(createModelsUrl(provider), headers);
    if (modelsResult.type === 'error') {
      return createNetworkFailure(modelsResult.error);
    }
    if (modelsResult.response.ok) {
      await modelsResult.response.body?.cancel();
      return { successful: true };
    }
    if (!unsupportedRouteStatuses.has(modelsResult.response.status)) {
      return createHttpFailure(modelsResult.response);
    }
    await modelsResult.response.body?.cancel();

    const baseResult = await this.request(provider.configuration.baseUrl, headers);
    if (baseResult.type === 'error') {
      return createNetworkFailure(baseResult.error);
    }
    await baseResult.response.body?.cancel();
    return { successful: true };
  }
}
