import { Firecrawl, SdkError } from 'firecrawl';
import { FetcherError, isRetryableStatus, normalizeFetcherError } from './fetcher-error';
import type { FetcherResult } from './fetcher';

const FIRECRAWL_TIMEOUT_MS = 60_000;

function normalizeTitle(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const title = value.trim();
  return title || null;
}

export async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<FetcherResult> {
  const client = new Firecrawl({
    apiKey,
    timeoutMs: FIRECRAWL_TIMEOUT_MS,
    // Firecrawl counts this as total attempts, not additional retries.
    maxRetries: 1,
  });

  try {
    const document = await client.scrape(url, { formats: ['markdown'] });
    if (typeof document.markdown !== 'string') {
      throw new FetcherError('missing_markdown', 'Firecrawl returned no markdown content', false);
    }

    return {
      title: normalizeTitle(document.metadata?.title),
      rawResponse: document,
    };
  } catch (error) {
    if (error instanceof SdkError) {
      const status = error.status;
      const isRetryable = status == null || isRetryableStatus(status);
      throw new FetcherError(
        error.code ?? 'firecrawl_error',
        error.message,
        isRetryable,
        status,
      );
    }
    throw normalizeFetcherError(error);
  }
}
