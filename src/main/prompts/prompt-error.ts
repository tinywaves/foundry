import type { PromptApiError, PromptApiErrorCode, PromptFieldError } from '../../shared/prompt-contract';
import { FoundryStorageError } from '../storage/storage-error';

export class PromptOperationError extends Error {
  readonly code: PromptApiErrorCode;
  readonly fields?: PromptFieldError[];

  constructor(code: PromptApiErrorCode, message: string, fields?: PromptFieldError[]) {
    super(message);
    this.name = 'PromptOperationError';
    this.code = code;
    this.fields = fields;
  }

  toApiError(): PromptApiError {
    return {
      code: this.code,
      message: this.message,
      ...(this.fields && { fields: this.fields }),
    };
  }
}

export function invalidPromptField(field: string, message: string): never {
  throw new PromptOperationError('invalid-input', 'Prompt input is invalid.', [{ field, message }]);
}

export function toPromptOperationError(error: unknown): PromptOperationError {
  if (error instanceof PromptOperationError) {
    return error;
  }

  if (error instanceof FoundryStorageError) {
    return new PromptOperationError(error.code, error.message);
  }

  const sqliteCode = getSqliteErrorCode(error);
  if (sqliteCode?.startsWith('SQLITE_CORRUPT') || sqliteCode?.startsWith('SQLITE_NOTADB')) {
    return new PromptOperationError('storage-corrupt', 'Prompt storage is corrupt.');
  }

  if (sqliteCode) {
    return new PromptOperationError('storage-unavailable', 'Prompt storage is unavailable.');
  }

  return new PromptOperationError('internal', 'The Prompt operation could not be completed.');
}

function getSqliteErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}
