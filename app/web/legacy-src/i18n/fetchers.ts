import type { FetcherType } from '@dhzh/foundry-shared';
import type { TranslationKey } from './messages';

const fetcherLabelKeys: Record<FetcherType, TranslationKey> = {
  firecrawl: 'fetchers.firecrawl',
};

export function fetcherLabelKey(fetcher: FetcherType): TranslationKey {
  return fetcherLabelKeys[fetcher];
}
