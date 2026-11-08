import type { StoredJobConfig } from '../contracts';
import { fetchWithFirecrawl } from './firecrawl';

export interface FetcherResult {
  title: string | null;
  rawResponse: unknown;
}

export function fetchCapture(
  url: string,
  config: StoredJobConfig,
  fetchImplementation: typeof fetch = fetch,
): Promise<FetcherResult> {
  return fetchWithFirecrawl(url, config.apiKey, fetchImplementation);
}
