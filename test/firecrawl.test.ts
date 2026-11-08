import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, it, vi } from 'vitest';
import type { FirecrawlSearchTransport } from '../src/features/captures/fetchers/firecrawl';
import {
  buildSearchQuery,
  createFirecrawlSearchTransport,
  createSearchRequest,
  FIRECRAWL_WIRE_PAGE_OPTIONS_KEY,
  fetchWithFirecrawl,
} from '../src/features/captures/fetchers/firecrawl';

function createTransport(payload: unknown): FirecrawlSearchTransport & {
  search: ReturnType<typeof vi.fn>;
} {
  return {
    search: vi.fn(() => Promise.resolve(payload)),
  };
}

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
  const transport = createTransport(payload);

  const result = await fetchWithFirecrawl(
    'https://ui.shadcn.com/docs',
    'secret',
    1,
    transport,
  );

  expect(result).toEqual({
    title: 'Introduction - shadcn/ui',
    rawResponse: payload,
    creditsUsed: 3,
  });
  expect(transport.search).toHaveBeenCalledWith(expect.objectContaining({
    [FIRECRAWL_WIRE_PAGE_OPTIONS_KEY]: expect.anything(),
  }));
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
    creditsUsed: 1,
  };
  const transport = createTransport(payload);

  const result = await fetchWithFirecrawl(
    'https://models.dev/labs/apodex',
    'secret',
    1,
    transport,
  );

  expect(result.title).toBe('Models.dev');
});

it('succeeds with no selected title when results do not belong to the submitted site', async () => {
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
    creditsUsed: 2,
  };
  const transport = createTransport(payload);

  await expect(fetchWithFirecrawl(
    'https://example.com/article',
    'secret',
    1,
    transport,
  )).resolves.toEqual({
    title: null,
    rawResponse: payload,
    creditsUsed: 2,
  });
});

it('treats zero search results as a successful fetch when credits are reported', async () => {
  const payload = {
    success: true,
    data: { web: [] },
    creditsUsed: 0,
  };
  const transport = createTransport(payload);

  await expect(fetchWithFirecrawl(
    'https://example.com/article',
    'secret',
    1,
    transport,
  )).resolves.toEqual({
    title: null,
    rawResponse: payload,
    creditsUsed: 0,
  });
});

it('fails when a successful response does not report credits', async () => {
  const transport = createTransport({
    success: true,
    data: { web: [] },
  });

  await expect(fetchWithFirecrawl(
    'https://example.com/article',
    'secret',
    1,
    transport,
  )).rejects.toMatchObject({
    code: 'missing_credits_used',
  });
});

it('lets the SDK manage retries and consumes only the final response', async () => {
  const payload = {
    success: true,
    data: {
      web: [
        {
          url: 'https://example.com/article',
          title: 'Example',
          metadata: {},
        },
      ],
    },
    creditsUsed: 2,
  };
  let attempts = 0;
  const server = createServer((_request, response) => {
    attempts += 1;
    response.setHeader('content-type', 'application/json');
    if (attempts < 3) {
      response.statusCode = 502;
      response.end(JSON.stringify({ success: false, error: 'Bad gateway' }));
      return;
    }

    response.statusCode = 200;
    response.end(JSON.stringify(payload));
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address() as AddressInfo;
    const transport = createFirecrawlSearchTransport('secret', 3, {
      apiUrl: `http://127.0.0.1:${address.port}`,
      backoffFactor: 0,
    });

    await expect(fetchWithFirecrawl(
      'https://example.com/article',
      'secret',
      3,
      transport,
    )).resolves.toEqual({
      title: 'Example',
      rawResponse: payload,
      creditsUsed: 2,
    });
    expect(attempts).toBe(3);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});
