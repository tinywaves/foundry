import type { DataTransferErrorCode } from './contracts';

export class DataTransferError extends Error {
  constructor(
    readonly code: DataTransferErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DataTransferError';
  }
}

export function normalizeDataTransferError(error: unknown): DataTransferError {
  return error instanceof DataTransferError
    ? error
    : new DataTransferError(
        'IO_ERROR',
        error instanceof Error ? error.message : 'The data transfer failed',
        { cause: error },
      );
}
