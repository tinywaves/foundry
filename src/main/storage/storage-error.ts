export type FoundryStorageErrorCode
  = | 'storage-unavailable'
    | 'storage-corrupt'
    | 'unsupported-database-version';

export class FoundryStorageError extends Error {
  readonly code: FoundryStorageErrorCode;

  constructor(code: FoundryStorageErrorCode, message: string) {
    super(message);
    this.name = 'FoundryStorageError';
    this.code = code;
  }
}

export function toFoundryStorageError(error: unknown): FoundryStorageError {
  if (error instanceof FoundryStorageError) {
    return error;
  }

  const sqliteCode = getSqliteErrorCode(error);
  if (sqliteCode?.startsWith('SQLITE_CORRUPT') || sqliteCode?.startsWith('SQLITE_NOTADB')) {
    return new FoundryStorageError('storage-corrupt', 'Foundry storage is corrupt.');
  }

  return new FoundryStorageError('storage-unavailable', 'Foundry storage is unavailable.');
}

function getSqliteErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}
