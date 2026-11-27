import type { DataExportInput } from '@dhzh/foundry-shared';

export class DataExportInputError extends Error {
  readonly code = 'INVALID_EXPORT_INPUT';
}

export function parseDataExportInput(value: unknown): DataExportInput {
  if (
    typeof value !== 'object' || value === null
    || !('passphrase' in value) || typeof value.passphrase !== 'string'
    || !value.passphrase
  ) {
    throw new DataExportInputError('A non-empty export passphrase is required');
  }
  return { passphrase: value.passphrase };
}
