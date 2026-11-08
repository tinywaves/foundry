export class FetcherError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'FetcherError';
  }
}

export function normalizeFetcherError(error: unknown): FetcherError {
  if (error instanceof FetcherError) {
    return error;
  }

  const status = readHTTPStatus(error);
  if (status !== null) {
    return new FetcherError(
      `http_${status}`,
      readErrorMessage(error) ?? `The configured fetcher returned ${status}`,
      status,
    );
  }
  if (isTimeoutError(error)) {
    return new FetcherError('timeout', 'The configured fetcher timed out');
  }
  if (isNetworkError(error)) {
    return new FetcherError(
      'network_error',
      error instanceof Error ? error.message : 'The configured fetcher could not be reached',
    );
  }

  return new FetcherError(
    'fetch_failed',
    error instanceof Error ? error.message : 'The capture fetch failed',
  );
}

function readHTTPStatus(error: unknown): number | null {
  if (!isRecord(error)) {
    return null;
  }

  const directStatus = readPositiveInteger(error.status);
  if (directStatus !== null) {
    return directStatus;
  }

  return isRecord(error.response)
    ? readPositiveInteger(error.response.status)
    : null;
}

function readErrorMessage(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }

  if (isRecord(error.response)) {
    const responseMessage = readPayloadMessage(error.response.data);
    if (responseMessage) {
      return responseMessage;
    }
  }
  return typeof error.message === 'string' && error.message
    ? error.message
    : readPayloadMessage(error.details);
}

function readPayloadMessage(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value.error === 'string' && value.error
    ? value.error
    : (typeof value.message === 'string' && value.message ? value.message : null);
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = readErrorCode(error);
  return error.name === 'TimeoutError'
    || code === 'ECONNABORTED'
    || code === 'ETIMEDOUT'
    || (/timeout/i).test(error.message);
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (!isRecord(error)) {
    return false;
  }

  const code = readErrorCode(error);
  return code === 'ECONNREFUSED'
    || code === 'ECONNRESET'
    || code === 'ENOTFOUND'
    || code === 'ERR_NETWORK'
    || (error.name === 'AxiosError' && !isRecord(error.response));
}

function readPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function readErrorCode(value: object): string | null {
  const property = (value as Record<string, unknown>).code;
  return typeof property === 'string' ? property : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
