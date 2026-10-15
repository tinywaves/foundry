import type {
  SkillApiError,
  SkillApiErrorCode,
  SkillFieldError,
} from '../../shared/skill-contract';
import { FoundryStorageError } from '../storage/storage-error';

const FILESYSTEM_ERROR_CODES = new Set([
  'EACCES',
  'EBUSY',
  'EDQUOT',
  'EIO',
  'ELOOP',
  'EMFILE',
  'ENFILE',
  'ENOENT',
  'ENOSPC',
  'ENOTDIR',
  'EPERM',
  'EROFS',
]);

export class SkillOperationError extends Error {
  readonly code: SkillApiErrorCode;
  readonly fields?: SkillFieldError[];
  readonly retryAfterSeconds?: number;

  constructor(
    code: SkillApiErrorCode,
    message: string,
    fields?: SkillFieldError[],
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'SkillOperationError';
    this.code = code;
    this.fields = fields;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  toApiError(): SkillApiError {
    return {
      code: this.code,
      message: this.message,
      ...(this.fields && { fields: this.fields }),
      ...(this.retryAfterSeconds !== undefined && {
        retryAfterSeconds: this.retryAfterSeconds,
      }),
    };
  }
}

export function invalidSkillField(field: string, message: string): never {
  throw new SkillOperationError(
    'invalid-input',
    'Skill input is invalid.',
    [{ field, message }],
  );
}

export function toSkillOperationError(error: unknown): SkillOperationError {
  if (error instanceof SkillOperationError) {
    return error;
  }

  if (error instanceof FoundryStorageError) {
    return new SkillOperationError(error.code, error.message);
  }

  const errorCode = getErrorCode(error);
  if (errorCode?.startsWith('SQLITE_CORRUPT') || errorCode?.startsWith('SQLITE_NOTADB')) {
    return new SkillOperationError('storage-corrupt', 'Skill storage is corrupt.');
  }
  if (errorCode?.startsWith('SQLITE_')) {
    return new SkillOperationError('storage-unavailable', 'Skill storage is unavailable.');
  }
  if (errorCode && FILESYSTEM_ERROR_CODES.has(errorCode)) {
    return new SkillOperationError(
      'filesystem-unavailable',
      'Skill files are unavailable.',
    );
  }

  return new SkillOperationError('internal', 'The Skill operation could not be completed.');
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return typeof error.code === 'string' ? error.code : undefined;
}
