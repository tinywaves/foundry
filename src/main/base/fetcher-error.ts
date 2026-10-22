export class FetcherError extends Error {
  readonly code: string;
  readonly isRetryable: boolean;
  readonly statusCode?: number;

  constructor(
    code: string,
    message: string,
    isRetryable: boolean,
    statusCode?: number,
  ) {
    super(message);
    this.name = 'FetcherError';
    this.code = code;
    this.isRetryable = isRetryable;
    this.statusCode = statusCode;
  }
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export function normalizeFetcherError(error: unknown): FetcherError {
  if (error instanceof FetcherError) {
    return error;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new FetcherError('timeout', 'The page fetch timed out', true);
  }

  if (error instanceof TypeError) {
    return new FetcherError('network_error', error.message, true);
  }

  const message = error instanceof Error ? error.message : 'The page fetch failed';
  return new FetcherError('fetch_failed', message, false);
}
