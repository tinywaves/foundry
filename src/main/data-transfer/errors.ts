import type {
  DataTransferErrorCode,
  DataTransferResult,
} from '../../shared/data-transfer';

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

export function dataTransferFailure(error: unknown): DataTransferResult<never> {
  const transferError = error instanceof DataTransferError
    ? error
    : new DataTransferError(
        'IO_ERROR',
        error instanceof Error ? error.message : 'The data transfer failed',
        { cause: error },
      );
  return {
    ok: false,
    error: {
      code: transferError.code,
      message: transferError.message,
    },
  };
}
