import type { FetcherType } from '../../shared/settings';
import { scrapeWithDeepSeek } from './deepseek-fetcher';
import { scrapeWithFirecrawl } from './firecrawl-fetcher';

export type FetcherResult = {
  title: string | null;
  rawResponse: unknown;
};

export type FetcherExecutionConfig = {
  fetcher: FetcherType;
  apiKey: string;
};

export async function scrapePage(
  url: string,
  config: FetcherExecutionConfig,
): Promise<FetcherResult> {
  return config.fetcher === 'firecrawl'
    ? scrapeWithFirecrawl(url, config.apiKey)
    : scrapeWithDeepSeek(url, config.apiKey);
}
