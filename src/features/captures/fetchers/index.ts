import type { StoredJobConfig } from '../contracts';
import { fetchWithDeepSeek } from './deepseek';
import { fetchWithFirecrawl } from './firecrawl';

export interface FetcherResult {
  title: string | null;
  rawResponse: unknown;
}

export function scrapePage(
  url: string,
  config: StoredJobConfig,
  fetchImplementation: typeof fetch = fetch,
): Promise<FetcherResult> {
  return config.fetcher === 'firecrawl'
    ? fetchWithFirecrawl(url, config.apiKey, fetchImplementation)
    : fetchWithDeepSeek(url, config.apiKey, fetchImplementation);
}
