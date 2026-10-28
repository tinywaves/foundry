import type { FetcherResult } from './index';
import { FetcherError, isRetryableStatus, normalizeFetcherError } from './error';

const DEEPSEEK_FETCH_URL = 'https://api.deepseek.com/v1/tools/fetch';
const FETCH_TIMEOUT_MS = 60_000;

export async function fetchWithDeepSeek(
  url: string,
  apiKey: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<FetcherResult> {
  try {
    const response = await fetchImplementation(DEEPSEEK_FETCH_URL, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new FetcherError(
        `http_${response.status}`,
        `DeepSeek returned ${response.status}`,
        isRetryableStatus(response.status),
        response.status,
      );
    }

    const payload: unknown = await response.json();
    if (
      !isRecord(payload)
      || typeof payload.title !== 'string'
      || typeof payload.content !== 'string'
    ) {
      throw new FetcherError(
        'invalid_response',
        'DeepSeek returned an invalid response',
        false,
      );
    }

    const title = payload.title.trim();
    return {
      title: title || null,
      rawResponse: payload,
    };
  } catch (error) {
    throw normalizeFetcherError(error);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
