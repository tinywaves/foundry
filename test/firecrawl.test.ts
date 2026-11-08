import { expect, it, vi } from 'vitest';
import {
  buildSearchQuery,
  createSearchRequest,
  FIRECRAWL_WIRE_PAGE_OPTIONS_KEY,
  fetchWithFirecrawl,
} from '../src/features/captures/fetchers/firecrawl';

it('builds focused site queries from URL context', () => {
  expect(buildSearchQuery('https://ui.shadcn.com/'))
    .toBe('site:ui.shadcn.com shadcn');
  expect(buildSearchQuery('https://ui.shadcn.com/docs'))
    .toBe('site:ui.shadcn.com docs');
  expect(buildSearchQuery('https://models.dev/labs/apodex/'))
    .toBe('site:models.dev apodex');
  expect(buildSearchQuery('https://github.com/vercel/next.js'))
    .toBe('site:github.com next.js');
  expect(buildSearchQuery('https://example.com/en/123e4567-e89b-12d3-a456-426614174000'))
    .toBe('site:example.com example');
});

it('uses one fixed Firecrawl Search shape for every URL', () => {
  expect(createSearchRequest('https://ui.shadcn.com/')).toEqual({
    query: 'site:ui.shadcn.com shadcn',
    limit: 5,
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
  });
});

it('selects the exact URL result and keeps the full response', async () => {
  const payload = {
    success: true,
    data: {
      web: [
        {
          url: 'https://ui.shadcn.com/',
          title: 'shadcn/ui',
          metadata: { sourceURL: 'https://ui.shadcn.com/' },
        },
        {
          url: 'https://ui.shadcn.com/docs',
          title: 'Introduction - shadcn/ui',
          metadata: { sourceURL: 'https://ui.shadcn.com/docs' },
        },
      ],
    },
    creditsUsed: 3,
  };
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(payload)));

  const result = await fetchWithFirecrawl(
    'https://ui.shadcn.com/docs',
    'secret',
    fetchMock,
  );

  expect(result).toEqual({
    title: 'Introduction - shadcn/ui',
    rawResponse: payload,
  });
  const requestInit = fetchMock.mock.calls[0]?.[1];
  const requestBodyText = requestInit?.body;
  if (typeof requestBodyText !== 'string') {
    throw new TypeError('Expected the Firecrawl request body to be JSON text');
  }
  expect(JSON.parse(requestBodyText)).toHaveProperty(
    FIRECRAWL_WIRE_PAGE_OPTIONS_KEY,
  );
});

it('falls back to the site homepage when the submitted deep URL is absent', async () => {
  const payload = {
    success: true,
    data: {
      web: [
        {
          url: 'https://models.dev/docs',
          title: 'Models documentation',
          metadata: {},
        },
        {
          url: 'https://models.dev/',
          title: 'Models.dev',
          metadata: {},
        },
      ],
    },
  };
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(payload)));

  const result = await fetchWithFirecrawl(
    'https://models.dev/labs/apodex',
    'secret',
    fetchMock,
  );

  expect(result.title).toBe('Models.dev');
});

it('fails when search results do not belong to the submitted site', async () => {
  const payload = {
    success: true,
    data: {
      web: [
        {
          url: 'https://example.net/',
          title: 'Unrelated result',
          metadata: {},
        },
      ],
    },
  };
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(payload)));

  await expect(fetchWithFirecrawl(
    'https://example.com/article',
    'secret',
    fetchMock,
  )).rejects.toMatchObject({
    code: 'no_matching_results',
  });
});
