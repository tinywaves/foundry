import type { StoredJobConfig } from '../contracts';
import { fetchWithFirecrawl } from './firecrawl';

export interface FetcherResult {
  title: string | null;
  rawResponse: unknown;
  creditsUsed: number | null;
}

export type CaptureFetcher = (
  url: string,
  config: StoredJobConfig,
) => Promise<FetcherResult>;

export function fetchCapture(
  url: string,
  config: StoredJobConfig,
): Promise<FetcherResult> {
  return fetchWithFirecrawl(
    url,
    config.apiKey,
    config.maxAttempts,
  );
}
