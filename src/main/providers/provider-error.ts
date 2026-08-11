import type { ProviderApiError, ProviderApiErrorCode, ProviderFieldError } from '../../shared/provider-contract';
import { FoundryStorageError } from '../storage/storage-error';

export class ProviderOperationError extends Error {
  readonly code: ProviderApiErrorCode;
  readonly fields?: ProviderFieldError[];

  constructor(code: ProviderApiErrorCode, message: string, fields?: ProviderFieldError[]) {
    super(message);
    this.name = 'ProviderOperationError';
    this.code = code;
    this.fields = fields;
  }

  toApiError(): ProviderApiError {
    return {
      code: this.code,
      message: this.message,
      ...(this.fields && { fields: this.fields }),
    };
  }
}

export function invalidProviderField(field: string, message: string): never {
  throw new ProviderOperationError('invalid-input', 'Provider input is invalid.', [{ field, message }]);
}

export function toProviderOperationError(error: unknown): ProviderOperationError {
  if (error instanceof ProviderOperationError) {
    return error;
  }

  if (error instanceof FoundryStorageError) {
    return new ProviderOperationError(error.code, error.message);
  }

  const sqliteCode = getSqliteErrorCode(error);
  if (sqliteCode?.startsWith('SQLITE_CORRUPT') || sqliteCode?.startsWith('SQLITE_NOTADB')) {
    return new ProviderOperationError('storage-corrupt', 'Provider storage is corrupt.');
  }

  if (sqliteCode) {
    return new ProviderOperationError('storage-unavailable', 'Provider storage is unavailable.');
  }

  return new ProviderOperationError('internal', 'The Provider operation could not be completed.');
}

function getSqliteErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}
