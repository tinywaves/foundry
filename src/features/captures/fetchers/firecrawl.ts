import type { FetcherResult } from './index';
import { FetcherError, isRetryableStatus, normalizeFetcherError } from './error';

const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v1/scrape';
const FETCH_TIMEOUT_MS = 60_000;

export async function fetchWithFirecrawl(
  url: string,
  apiKey: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<FetcherResult> {
  try {
    const response = await fetchImplementation(FIRECRAWL_SCRAPE_URL, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new FetcherError(
        `http_${response.status}`,
        `Firecrawl returned ${response.status}`,
        isRetryableStatus(response.status),
        response.status,
      );
    }

    const payload: unknown = await response.json();
    const document = readDocument(payload);
    if (!document) {
      throw new FetcherError(
        'invalid_response',
        'Firecrawl returned an invalid response',
        false,
      );
    }

    return document;
  } catch (error) {
    throw normalizeFetcherError(error);
  }
}

function readDocument(value: unknown): FetcherResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const data = isRecord(value.data) ? value.data : value;
  const markdown = typeof data.markdown === 'string' ? data.markdown : null;
  if (markdown === null) {
    return null;
  }

  const metadata = isRecord(data.metadata) ? data.metadata : {};
  const title = typeof metadata.title === 'string' ? metadata.title.trim() : '';

  return {
    title: title || null,
    rawResponse: data,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
