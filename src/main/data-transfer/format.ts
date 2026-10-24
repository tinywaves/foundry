import {
  dataExportArchiveVersion,
  dataExportExtension,
  dataExportSettingsVersion,
} from '../../shared/data-transfer';
import { DataTransferError } from './errors';

export const dataExportFormat = 'foundry.snapshot';
export const databaseEntryPath = 'database/foundry.sqlite';
export const settingsEntryPath = 'settings.json';
export const manifestEntryPath = 'manifest.json';

export type ExportFileRecord = {
  bytes: number;
  path: string;
  sha256: string;
};

export type ExportManifest = {
  format: typeof dataExportFormat;
  archiveVersion: number;
  appVersion: string;
  createdAt: string;
  database: ExportFileRecord & {
    schemaVersion: number;
  };
  settings: ExportFileRecord & {
    version: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new DataTransferError('INVALID_ARCHIVE', `${field} must be a non-empty string`);
  }
  return value;
}

function readInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new DataTransferError('INVALID_ARCHIVE', `${field} must be a non-negative integer`);
  }
  return value;
}

function readFileRecord(value: unknown, path: string): ExportFileRecord {
  if (!isRecord(value)) {
    throw new DataTransferError('INVALID_ARCHIVE', 'File metadata is invalid');
  }
  if (value.path !== path) {
    throw new DataTransferError('INVALID_ARCHIVE', 'File metadata path is invalid');
  }
  const sha256 = readString(value.sha256, 'sha256');
  if (!(/^[a-f0-9]{64}$/u).test(sha256)) {
    throw new DataTransferError('INVALID_ARCHIVE', 'File checksum is invalid');
  }
  return {
    path,
    bytes: readInteger(value.bytes, 'bytes'),
    sha256,
  };
}

export function parseExportManifest(value: unknown): ExportManifest {
  if (!isRecord(value) || value.format !== dataExportFormat) {
    throw new DataTransferError('INVALID_ARCHIVE', 'The file is not a Foundry export');
  }

  const archiveVersion = readInteger(value.archiveVersion, 'archiveVersion');
  if (archiveVersion > dataExportArchiveVersion) {
    throw new DataTransferError(
      'UNSUPPORTED_ARCHIVE',
      'The archive version is newer than this Foundry version',
    );
  }
  if (archiveVersion !== dataExportArchiveVersion) {
    throw new DataTransferError('UNSUPPORTED_ARCHIVE', 'The archive version is not supported');
  }

  const createdAt = readString(value.createdAt, 'createdAt');
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new DataTransferError('INVALID_ARCHIVE', 'createdAt is invalid');
  }

  if (!isRecord(value.database) || !isRecord(value.settings)) {
    throw new DataTransferError('INVALID_ARCHIVE', 'Archive file metadata is missing');
  }

  const database = {
    ...readFileRecord(value.database, databaseEntryPath),
    schemaVersion: readInteger(value.database.schemaVersion, 'database.schemaVersion'),
  };
  const settings = {
    ...readFileRecord(value.settings, settingsEntryPath),
    version: readInteger(value.settings.version, 'settings.version'),
  };

  if (settings.version > dataExportSettingsVersion) {
    throw new DataTransferError(
      'UNSUPPORTED_ARCHIVE',
      'The settings version is newer than this Foundry version',
    );
  }

  return {
    format: dataExportFormat,
    archiveVersion,
    appVersion: readString(value.appVersion, 'appVersion'),
    createdAt,
    database,
    settings,
  };
}

export function ensureDataExportExtension(filePath: string): string {
  return filePath.toLowerCase().endsWith(dataExportExtension)
    ? filePath
    : `${filePath}${dataExportExtension}`;
}
