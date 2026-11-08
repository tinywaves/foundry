import { FirecrawlClient } from 'firecrawl';
import { parse as parseDomain } from 'tldts';
import type { FetcherResult } from './index';
import { FetcherError, normalizeFetcherError } from './error';

const SEARCH_RESULT_LIMIT = 5;
const MAX_QUERY_TERM_LENGTH = 200;

// Firecrawl uses this field name in its public request contract.
export const FIRECRAWL_WIRE_PAGE_OPTIONS_KEY = 'scrapeOptions';

interface FirecrawlPageOptions {
  formats: ['summary'];
  onlyMainContent: true;
  onlyCleanContent: false;
  maxAge: 172_800_000;
  timeout: 60_000;
  removeBase64Images: true;
  blockAds: true;
  proxy: 'auto';
  storeInCache: true;
}

export interface FirecrawlSearchRequest {
  query: string;
  limit: number;
  sources: ['web'];
  highlights: false;
  ignoreInvalidURLs: true;
  timeout: 120_000;
  pageOptions: FirecrawlPageOptions;
}

export interface FirecrawlWireSearchRequest
  extends Omit<FirecrawlSearchRequest, 'pageOptions'> {
  [FIRECRAWL_WIRE_PAGE_OPTIONS_KEY]: FirecrawlPageOptions;
}

interface FirecrawlSearchEnvelope {
  success?: boolean;
  data?: unknown;
  creditsUsed?: unknown;
  error?: string;
  warning?: string;
  id?: string;
}

export interface FirecrawlSearchTransport {
  search: (request: FirecrawlWireSearchRequest) => Promise<unknown>;
}

export interface FirecrawlSearchTransportOptions {
  apiUrl?: string;
  backoffFactor?: number;
}

interface WebSearchResult {
  url: string;
  title: string | null;
  metadata: Record<string, unknown>;
}

class FoundryFirecrawlClient extends FirecrawlClient {
  async searchEnvelope(
    request: FirecrawlWireSearchRequest,
  ): Promise<unknown> {
    const response = await this.http.post<FirecrawlSearchEnvelope>(
      '/v2/search',
      { ...request },
      { timeoutMs: request.timeout + 5000 },
    );
    return response.data;
  }
}

export function createFirecrawlSearchTransport(
  apiKey: string,
  maxAttempts: number,
  options: FirecrawlSearchTransportOptions = {},
): FirecrawlSearchTransport {
  const client = new FoundryFirecrawlClient({
    apiKey,
    maxRetries: Math.max(1, Math.trunc(maxAttempts)),
    ...(options.apiUrl && { apiUrl: options.apiUrl }),
    ...(options.backoffFactor !== undefined && {
      backoffFactor: options.backoffFactor,
    }),
  });

  return {
    search: (request) => client.searchEnvelope(request),
  };
}

export async function fetchWithFirecrawl(
  url: string,
  apiKey: string,
  maxAttempts = 1,
  transport: FirecrawlSearchTransport = createFirecrawlSearchTransport(
    apiKey,
    maxAttempts,
  ),
): Promise<FetcherResult> {
  try {
    const request = createSearchRequest(url);
    const payload = await transport.search(toWireRequest(request));
    if (!isRecord(payload)) {
      throw new FetcherError(
        'invalid_response',
        'The configured fetcher returned an invalid response',
      );
    }
    if (payload.success === false) {
      throw new FetcherError(
        'fetcher_error',
        readFirecrawlError(payload) ?? 'The configured fetcher reported an error',
      );
    }
    if (payload.success !== true) {
      throw new FetcherError(
        'invalid_response',
        'The configured fetcher returned an invalid response',
      );
    }

    const creditsUsed = readCreditsUsed(payload);
    if (creditsUsed === null) {
      throw new FetcherError(
        'missing_credits_used',
        'The configured fetcher response did not report credit usage',
      );
    }

    const results = readWebResults(payload);
    const result = selectSearchResult(url, results);

    return {
      title: result ? readResultTitle(result) : null,
      rawResponse: payload,
      creditsUsed,
    };
  } catch (error) {
    throw normalizeFetcherError(error);
  }
}

export function createSearchRequest(url: string): FirecrawlSearchRequest {
  return {
    query: buildSearchQuery(url),
    limit: SEARCH_RESULT_LIMIT,
    sources: ['web'],
    highlights: false,
    ignoreInvalidURLs: true,
    timeout: 120_000,
    pageOptions: {
      formats: ['summary'],
      onlyMainContent: true,
      onlyCleanContent: false,
      maxAge: 172_800_000,
      timeout: 60_000,
      removeBase64Images: true,
      blockAds: true,
      proxy: 'auto',
      storeInCache: true,
    },
  };
}

function toWireRequest(
  request: FirecrawlSearchRequest,
): FirecrawlWireSearchRequest {
  return {
    query: request.query,
    limit: request.limit,
    sources: request.sources,
    highlights: request.highlights,
    ignoreInvalidURLs: request.ignoreInvalidURLs,
    timeout: request.timeout,
    [FIRECRAWL_WIRE_PAGE_OPTIONS_KEY]: request.pageOptions,
  };
}

export function buildSearchQuery(value: string): string {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  const pathTerm = readLastMeaningfulPathSegment(url.pathname);
  const brand = readBrandToken(hostname);
  const term = pathTerm ?? brand ?? hostname.split('.', 1)[0];
  const queryTerm = term
    .replaceAll(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_TERM_LENGTH);

  return `site:${hostname} ${queryTerm}`;
}

function readLastMeaningfulPathSegment(pathname: string): string | null {
  const segments = pathname
    .split('/')
    .map((segment) => decodePathSegment(segment))
    .filter(Boolean);

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const rawSegment = segments[index]?.trim() ?? '';
    if (!rawSegment || isWeakPathSegment(rawSegment)) {
      continue;
    }

    const segment = normalizePathSegment(rawSegment);
    if (segment) {
      return segment;
    }
  }

  return null;
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function normalizePathSegment(segment: string): string {
  return segment
    .replace(/\.(?:html?|php|aspx?|jsp)$/i, '')
    .replaceAll(/[-_]+/g, ' ')
    .trim();
}

function isWeakPathSegment(segment: string): boolean {
  return (/^(?:index|home|latest)$/i).test(segment)
    || (/^\d+$/).test(segment)
    || (/^v?\d+(?:\.\d+)+$/i).test(segment)
    || (/^[a-z]{2}(?:[-_][a-z]{2})?$/i).test(segment)
    || (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i).test(segment)
    || (/^[0-9a-f]{20,}$/i).test(segment);
}

function readBrandToken(hostname: string): string | null {
  const parsed = parseDomain(hostname, { allowPrivateDomains: true });
  const brand = parsed.domainWithoutSuffix?.trim();
  return brand || null;
}

function readWebResults(payload: Record<string, unknown>): WebSearchResult[] {
  if (!isRecord(payload.data) || !Array.isArray(payload.data.web)) {
    return [];
  }

  return payload.data.web.flatMap((value): WebSearchResult[] => {
    if (!isRecord(value) || typeof value.url !== 'string' || !value.url) {
      return [];
    }

    const result: WebSearchResult = {
      url: value.url,
      title: typeof value.title === 'string' ? value.title : null,
      metadata: isRecord(value.metadata) ? value.metadata : {},
    };

    return [result];
  });
}

function selectSearchResult(
  requestedURL: string,
  results: WebSearchResult[],
): WebSearchResult | null {
  const requested = comparableURL(requestedURL);
  if (requested) {
    const exact = results.find((result) =>
      resultURLs(result).some((url) => comparableURL(url) === requested));
    if (exact) {
      return exact;
    }
  }

  const requestedHost = sameSiteHost(requestedURL);
  const sameSite = requestedHost === null
    ? []
    : results.filter((result) =>
        resultURLs(result).some((url) => sameSiteHost(url) === requestedHost));

  const homepage = sameSite.find((result) => isHomepage(result));
  return homepage ?? (sameSite.length > 0 ? sameSite[0] : null);
}

function resultURLs(result: WebSearchResult): string[] {
  const urls = [
    result.url,
    readMetadataString(result, 'sourceURL'),
    readMetadataString(result, 'url'),
  ];

  return urls.filter((url): url is string => Boolean(url));
}

function comparableURL(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = '';
    url.searchParams.sort();
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }
    return url.href;
  } catch {
    return null;
  }
}

function sameSiteHost(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isHomepage(result: WebSearchResult): boolean {
  return resultURLs(result).some((value) => {
    try {
      return new URL(value).pathname === '/';
    } catch {
      return false;
    }
  });
}

function readResultTitle(result: WebSearchResult): string | null {
  const searchTitle = result.title?.trim();
  return searchTitle
    || readMetadataString(result, 'ogTitle')?.trim()
    || readMetadataString(result, 'title')?.trim()
    || null;
}

function readMetadataString(
  result: WebSearchResult,
  key: string,
): string | null {
  const value = result.metadata[key];
  return typeof value === 'string' && value ? value : null;
}

function readCreditsUsed(payload: Record<string, unknown>): number | null {
  return typeof payload.creditsUsed === 'number'
    && Number.isSafeInteger(payload.creditsUsed)
    && payload.creditsUsed >= 0
    ? payload.creditsUsed
    : null;
}

function readFirecrawlError(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  return typeof payload.error === 'string' && payload.error
    ? payload.error
    : (typeof payload.message === 'string' && payload.message
        ? payload.message
        : null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
