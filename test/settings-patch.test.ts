import { expect, it } from 'vitest';
import { credentialPatch } from '../app/web/src/features/settings/api';

it('preserves untouched capture keys and sends explicit clears', () => {
  expect(credentialPatch({
    apiKey: '',
    hasApiKey: true,
    shouldClearApiKey: false,
  }, 'firecrawlApiKey')).toEqual({});

  expect(credentialPatch({
    apiKey: '',
    hasApiKey: true,
    shouldClearApiKey: true,
  }, 'firecrawlApiKey')).toEqual({ firecrawlApiKey: '' });

  expect(credentialPatch({
    apiKey: 'new-secret',
    hasApiKey: true,
    shouldClearApiKey: false,
  }, 'firecrawlApiKey')).toEqual({ firecrawlApiKey: 'new-secret' });
});
