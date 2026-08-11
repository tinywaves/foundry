import type { RuntimeApiError, RuntimeApiErrorCode } from '../../shared/runtime-contract';
import { FoundryStorageError } from '../storage/storage-error';

export class RuntimeOperationError extends Error {
  readonly code: RuntimeApiErrorCode;

  constructor(code: RuntimeApiErrorCode, message: string) {
    super(message);
    this.name = 'RuntimeOperationError';
    this.code = code;
  }

  toApiError(): RuntimeApiError {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export function toRuntimeOperationError(error: unknown): RuntimeOperationError {
  if (error instanceof RuntimeOperationError) {
    return error;
  }

  if (error instanceof FoundryStorageError) {
    return new RuntimeOperationError(error.code, error.message);
  }

  const sqliteCode = getSqliteErrorCode(error);
  if (sqliteCode?.startsWith('SQLITE_CORRUPT') || sqliteCode?.startsWith('SQLITE_NOTADB')) {
    return new RuntimeOperationError('storage-corrupt', 'Runtime storage is corrupt.');
  }

  if (sqliteCode) {
    return new RuntimeOperationError('storage-unavailable', 'Runtime storage is unavailable.');
  }

  return new RuntimeOperationError('internal', 'The Runtime operation could not be completed.');
}

function getSqliteErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}
