import { DATA_BACKUP_ENTRY, DATA_BACKUP_FORMAT, DATA_BACKUP_VERSION } from '@dhzh/foundry-shared';
import type { DataBackupManifest, DataImportErrorCode, FoundryData } from '@dhzh/foundry-shared';

import { normalizeSettings } from '../settings/contracts';

export class DataImportError extends Error {
  constructor(readonly code: DataImportErrorCode, message: string) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseDataBackupManifest(value: unknown): Pick<DataBackupManifest, 'data'> {
  if (
    !isRecord(value) || value.format !== DATA_BACKUP_FORMAT
    || value.archiveVersion !== DATA_BACKUP_VERSION
    || !isRecord(value.data) || value.data.path !== DATA_BACKUP_ENTRY
    || typeof value.data.bytes !== 'number' || !Number.isSafeInteger(value.data.bytes)
    || value.data.bytes <= 0
    || typeof value.data.sha256 !== 'string' || !(/^[a-f0-9]{64}$/u).test(value.data.sha256)
  ) {
    throw new DataImportError('INVALID_BACKUP', 'Unsupported or invalid backup manifest');
  }
  return {
    data: { path: DATA_BACKUP_ENTRY, bytes: value.data.bytes, sha256: value.data.sha256 },
  };
}

export function parseImportData(value: unknown): FoundryData {
  if (!isRecord(value) || !isRecord(value.settings)) {
    throw new DataImportError('INVALID_BACKUP', 'Backup data must contain a settings object');
  }
  return { settings: normalizeSettings(value.settings) };
}
