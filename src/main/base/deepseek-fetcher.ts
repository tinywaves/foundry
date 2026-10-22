import { FetcherError, isRetryableStatus, normalizeFetcherError } from './fetcher-error';
import type { FetcherResult } from './fetcher';

const DEEPSEEK_FETCH_URL = 'https://api.deepseek.com/v1/tools/fetch';
const DEEPSEEK_TIMEOUT_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeTitle(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const title = value.trim();
  return title || null;
}

export async function scrapeWithDeepSeek(url: string, apiKey: string): Promise<FetcherResult> {
  try {
    const response = await fetch(DEEPSEEK_FETCH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
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
    if (!isRecord(payload) || typeof payload.title !== 'string' || typeof payload.content !== 'string') {
      throw new FetcherError(
        'invalid_response',
        'DeepSeek returned an invalid response',
        false,
      );
    }

    return {
      title: normalizeTitle(payload.title),
      rawResponse: payload,
    };
  } catch (error) {
    throw normalizeFetcherError(error);
  }
}
