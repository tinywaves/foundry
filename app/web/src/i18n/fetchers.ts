import type { FetcherType } from '../shared/settings';
import type { TranslationKey } from './messages';

const fetcherLabelKeys: Record<FetcherType, TranslationKey> = {
  firecrawl: 'fetchers.firecrawl',
};

export function fetcherLabelKey(fetcher: FetcherType): TranslationKey {
  return fetcherLabelKeys[fetcher];
}
