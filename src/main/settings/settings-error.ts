import type { SettingsApiError, SettingsApiErrorCode } from '../../shared/settings-contract';
import { FoundryStorageError } from '../storage/storage-error';

export class SettingsOperationError extends Error {
  readonly code: SettingsApiErrorCode;

  constructor(code: SettingsApiErrorCode, message: string) {
    super(message);
    this.name = 'SettingsOperationError';
    this.code = code;
  }

  toApiError(): SettingsApiError {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export function toSettingsOperationError(error: unknown): SettingsOperationError {
  if (error instanceof SettingsOperationError) {
    return error;
  }

  if (error instanceof FoundryStorageError) {
    return new SettingsOperationError(error.code, error.message);
  }

  const sqliteCode = getSqliteErrorCode(error);
  if (sqliteCode?.startsWith('SQLITE_CORRUPT') || sqliteCode?.startsWith('SQLITE_NOTADB')) {
    return new SettingsOperationError('storage-corrupt', 'Settings storage is corrupt.');
  }

  if (sqliteCode) {
    return new SettingsOperationError('storage-unavailable', 'Settings storage is unavailable.');
  }

  return new SettingsOperationError('internal', 'The Settings operation could not be completed.');
}

function getSqliteErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}
