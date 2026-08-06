import type {
  ProviderConnectionSummary,
  ProviderConnectionTestInput,
} from '../../shared/provider-contract';
import { parseProviderConnectionTestInput } from './provider-validation';

export const PROVIDER_CONNECTION_TIMEOUT_MS = 15_000;
const MAX_ERROR_LENGTH = 160;
const REDIRECT_STATUSES = new Set([300, 301, 302, 303, 305, 307, 308]);

export interface ProviderConnectionRequestInit {
  method: 'GET';
  headers: Record<string, string>;
  redirect: 'manual';
  signal: AbortSignal;
}

export interface ProviderConnectionResponse {
  status: number;
  statusText: string;
}

export type ProviderConnectionRequest = (
  url: string,
  init: ProviderConnectionRequestInit,
) => Promise<ProviderConnectionResponse>;

function appendPath(baseUrl: string, suffix: string): string {
  const url = new URL(baseUrl);
  const basePath = url.pathname.replace(/\/+$/u, '');
  url.pathname = `${basePath}/${suffix}`;
  return url.href;
}

function buildRequestUrl(input: ProviderConnectionTestInput): string {
  if (input.runtime === 'codex') {
    return appendPath(input.baseUrl, 'models');
  }
  const path = new URL(input.baseUrl).pathname.replace(/\/+$/u, '');
  return appendPath(input.baseUrl, path.endsWith('/v1') ? 'models' : 'v1/models');
}

function buildHeaders(input: ProviderConnectionTestInput): Record<string, string> {
  if (input.runtime === 'codex') {
    return input.apiKey === null ? {} : { Authorization: `Bearer ${input.apiKey}` };
  }
  return {
    'anthropic-version': '2023-06-01',
    ...(input.apiKey !== null && { 'x-api-key': input.apiKey }),
  };
}

function sanitizeStatusText(value: string): string {
  let sanitized = '';
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    sanitized += codePoint <= 0x1F || codePoint === 0x7F ? ' ' : character;
  }
  return sanitized
    .replaceAll(/\s+/gu, ' ')
    .trim();
}

function failedSummary(lastError: string, now: () => number): ProviderConnectionSummary {
  return {
    status: 'failed',
    lastTestedAt: now(),
    lastError: lastError.slice(0, MAX_ERROR_LENGTH),
  };
}

export class ProviderConnectionTester {
  constructor(
    private readonly request: ProviderConnectionRequest,
    private readonly timeoutMs = PROVIDER_CONNECTION_TIMEOUT_MS,
    private readonly now: () => number = Date.now,
  ) {}

  async test(inputValue: unknown): Promise<ProviderConnectionSummary> {
    const input = parseProviderConnectionTestInput(inputValue);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await this.request(buildRequestUrl(input), {
        method: 'GET',
        headers: buildHeaders(input),
        redirect: 'manual',
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        return failedSummary(`Connection timed out after ${this.timeoutMs / 1000} seconds.`, this.now);
      }
      if (response.status >= 200 && response.status < 300) {
        return {
          status: 'connected',
          lastTestedAt: this.now(),
          lastError: null,
        };
      }
      if (REDIRECT_STATUSES.has(response.status)) {
        return failedSummary('Redirect responses are not allowed.', this.now);
      }
      const statusText = sanitizeStatusText(response.statusText);
      const error = statusText
        ? `HTTP ${response.status} ${statusText}`
        : `HTTP ${response.status}`;
      return failedSummary(error, this.now);
    } catch {
      return failedSummary(
        controller.signal.aborted
          ? `Connection timed out after ${this.timeoutMs / 1000} seconds.`
          : 'Network or TLS connection failed.',
        this.now,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
