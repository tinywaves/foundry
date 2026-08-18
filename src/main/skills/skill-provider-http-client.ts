import { Buffer } from 'node:buffer';
import { SkillOperationError } from './skill-error';

export interface SkillProviderHttpPolicy {
  requestTimeoutMs: number;
  maxRedirects: number;
  maxResponseBytes: number;
  cacheTtlMs: number;
  maxCacheEntries: number;
}

export const defaultSkillProviderHttpPolicy: SkillProviderHttpPolicy = {
  requestTimeoutMs: 10_000,
  maxRedirects: 3,
  maxResponseBytes: 1024 * 1024,
  cacheTtlMs: 30_000,
  maxCacheEntries: 32,
};

interface SkillProviderHttpClientOptions {
  fetch?: typeof fetch;
  now?: () => number;
  policy?: Partial<SkillProviderHttpPolicy>;
}

interface SkillProviderJsonRequest {
  url: string;
  allowedHosts: ReadonlySet<string>;
  cache?: boolean;
}

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

export type SkillProviderContent
  = | { kind: 'json'; value: unknown }
    | { kind: 'binary'; contentType: string };

export class SkillProviderHttpClient {
  private readonly fetch: typeof fetch;
  private readonly now: () => number;
  private readonly policy: SkillProviderHttpPolicy;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(options: SkillProviderHttpClientOptions = {}) {
    this.fetch = options.fetch ?? globalThis.fetch;
    this.now = options.now ?? Date.now;
    this.policy = validatePolicy({
      ...defaultSkillProviderHttpPolicy,
      ...options.policy,
    });
  }

  async getJson(request: SkillProviderJsonRequest): Promise<unknown> {
    const url = parseProviderUrl(request.url, request.allowedHosts);
    const cacheKey = url.href;
    if (request.cache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > this.now()) {
        return cached.value;
      }
      this.cache.delete(cacheKey);
    }
    const response = await this.request(url, request.allowedHosts, 'application/json');
    if (!isJsonContentType(response.headers.get('content-type'))) {
      await response.body?.cancel();
      throw new SkillOperationError('source-unavailable', 'The remote provider response is invalid.');
    }
    const value = await readBoundedJson(response, this.policy.maxResponseBytes);
    if (request.cache !== false) {
      this.setCache(cacheKey, value);
    }
    return value;
  }

  async inspectJsonOrBinary(request: SkillProviderJsonRequest): Promise<SkillProviderContent> {
    const url = parseProviderUrl(request.url, request.allowedHosts);
    const response = await this.request(
      url,
      request.allowedHosts,
      'application/json, application/zip;q=0.9, application/octet-stream;q=0.8',
    );
    const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim() ?? '';
    if (isJsonContentType(contentType)) {
      return {
        kind: 'json',
        value: await readBoundedJson(response, this.policy.maxResponseBytes),
      };
    }
    await response.body?.cancel();
    return { kind: 'binary', contentType };
  }

  clearCache(): void {
    this.cache.clear();
  }

  // eslint-disable-next-line unicorn/consistent-class-member-order
  private setCache(key: string, value: unknown): void {
    this.cache.delete(key);
    this.cache.set(key, {
      expiresAt: this.now() + this.policy.cacheTtlMs,
      value,
    });
    while (this.cache.size > this.policy.maxCacheEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (typeof oldestKey !== 'string') {
        break;
      }
      this.cache.delete(oldestKey);
    }
  }

  private async request(
    initialUrl: URL,
    allowedHosts: ReadonlySet<string>,
    accept: string,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.policy.requestTimeoutMs);
    let currentUrl = initialUrl;
    try {
      for (let redirectCount = 0; redirectCount <= this.policy.maxRedirects; redirectCount += 1) {
        const response = await this.fetch(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: { Accept: accept },
        });
        if (!isRedirect(response.status)) {
          try {
            assertSuccessfulResponse(response);
          } catch (error) {
            await response.body?.cancel();
            throw error;
          }
          return response;
        }
        await response.body?.cancel();
        if (redirectCount === this.policy.maxRedirects) {
          throw new SkillOperationError(
            'resource-limit',
            'The remote provider redirected too many times.',
          );
        }
        const location = response.headers.get('location');
        if (!location) {
          throw new SkillOperationError(
            'source-unavailable',
            'The remote provider redirect is invalid.',
          );
        }
        currentUrl = parseProviderUrl(new URL(location, currentUrl).href, allowedHosts);
      }
      throw new SkillOperationError('source-unavailable', 'The remote provider is unavailable.');
    } catch (error) {
      if (isAbortError(error)) {
        throw new SkillOperationError(
          'operation-timeout',
          'The remote provider request timed out.',
        );
      }
      if (error instanceof SkillOperationError) {
        throw error;
      }
      throw new SkillOperationError('network-unavailable', 'The remote provider is unavailable.');
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseProviderUrl(value: string, allowedHosts: ReadonlySet<string>): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SkillOperationError('invalid-input', 'The remote provider URL is invalid.');
  }
  if (
    url.protocol !== 'https:'
    || url.username !== ''
    || url.password !== ''
    || !allowedHosts.has(url.hostname.toLowerCase())
  ) {
    throw new SkillOperationError('source-unavailable', 'The remote provider URL is not allowed.');
  }
  return url;
}

function assertSuccessfulResponse(response: Response): void {
  if (response.status === 401 || response.status === 403) {
    throw new SkillOperationError(
      'authentication-required',
      'The remote provider requires authentication.',
    );
  }
  if (response.status === 429) {
    throw new SkillOperationError(
      'rate-limited',
      'The remote provider is rate limited.',
      undefined,
      parseRetryAfter(response.headers.get('retry-after')),
    );
  }
  if (!response.ok || !response.body) {
    throw new SkillOperationError('source-unavailable', 'The remote provider is unavailable.');
  }
}

async function readBoundedJson(response: Response, maxBytes: number): Promise<unknown> {
  const contentLength = parseContentLength(response.headers.get('content-length'));
  if (contentLength !== null && contentLength > maxBytes) {
    await response.body?.cancel();
    throw new SkillOperationError('resource-limit', 'The remote provider response is too large.');
  }
  const reader = response.body?.getReader();
  if (!reader) {
    throw new SkillOperationError('source-unavailable', 'The remote provider response is invalid.');
  }
  const chunks: Buffer[] = [];
  let byteLength = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      const buffer = Buffer.from(chunk.value);
      byteLength += buffer.length;
      if (byteLength > maxBytes) {
        await reader.cancel();
        throw new SkillOperationError(
          'resource-limit',
          'The remote provider response is too large.',
        );
      }
      chunks.push(buffer);
    }
  } catch (error) {
    if (error instanceof SkillOperationError) {
      throw error;
    }
    throw new SkillOperationError('network-unavailable', 'The remote provider response is incomplete.');
  }
  try {
    return JSON.parse(Buffer.concat(chunks, byteLength).toString('utf8')) as unknown;
  } catch {
    throw new SkillOperationError('source-unavailable', 'The remote provider response is invalid.');
  }
}

function isJsonContentType(value: string | null): boolean {
  const mediaType = value?.split(';', 1)[0].trim().toLowerCase() ?? '';
  return mediaType === 'application/json' || mediaType.endsWith('+json');
}

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }
  const seconds = Number(value);
  if (Number.isSafeInteger(seconds) && seconds >= 0) {
    return Math.min(seconds, 86_400);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }
  const secondsUntilRetry = Math.ceil((timestamp - Date.now()) / 1000);
  return Math.min(Math.max(secondsUntilRetry, 0), 86_400);
}

function parseContentLength(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function validatePolicy(policy: SkillProviderHttpPolicy): SkillProviderHttpPolicy {
  for (const value of Object.values(policy)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new SkillOperationError('invalid-input', 'The remote provider policy is invalid.');
    }
  }
  return policy;
}
