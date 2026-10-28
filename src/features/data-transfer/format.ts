import {
  DATA_EXPORT_ARCHIVE_VERSION,
  DATA_EXPORT_EXTENSION,
  DATA_EXPORT_SETTINGS_VERSION,
} from './contracts';
import { DataTransferError } from './errors';

export const DATA_EXPORT_FORMAT = 'foundry.snapshot';
export const DATABASE_ENTRY_PATH = 'database/foundry.sqlite';
export const SETTINGS_ENTRY_PATH = 'settings.json';
export const MANIFEST_ENTRY_PATH = 'manifest.json';

export interface FileRecord {
  path: string;
  bytes: number;
  sha256: string;
}

export interface ExportManifest {
  format: typeof DATA_EXPORT_FORMAT;
  archiveVersion: number;
  appVersion: string;
  createdAt: string;
  database: FileRecord & {
    schemaVersion: number;
  };
  settings: FileRecord & {
    version: number;
  };
}

export function parseExportManifest(value: unknown): ExportManifest {
  if (!isRecord(value) || value.format !== DATA_EXPORT_FORMAT) {
    throw new DataTransferError('INVALID_ARCHIVE', 'The file is not a Foundry export');
  }

  const archiveVersion = readInteger(value.archiveVersion, 'archiveVersion');
  if (archiveVersion !== DATA_EXPORT_ARCHIVE_VERSION) {
    throw new DataTransferError(
      'UNSUPPORTED_ARCHIVE',
      'The archive version is not supported',
    );
  }

  const createdAt = readString(value.createdAt, 'createdAt');
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new DataTransferError('INVALID_ARCHIVE', 'createdAt is invalid');
  }

  if (!isRecord(value.database) || !isRecord(value.settings)) {
    throw new DataTransferError('INVALID_ARCHIVE', 'Archive file metadata is missing');
  }

  const settingsVersion = readInteger(value.settings.version, 'settings.version');
  if (settingsVersion > DATA_EXPORT_SETTINGS_VERSION) {
    throw new DataTransferError(
      'UNSUPPORTED_ARCHIVE',
      'The settings version is newer than this Foundry version',
    );
  }

  return {
    format: DATA_EXPORT_FORMAT,
    archiveVersion,
    appVersion: readString(value.appVersion, 'appVersion'),
    createdAt,
    database: {
      ...readFileRecord(value.database, DATABASE_ENTRY_PATH),
      schemaVersion: readInteger(value.database.schemaVersion, 'database.schemaVersion'),
    },
    settings: {
      ...readFileRecord(value.settings, SETTINGS_ENTRY_PATH),
      version: settingsVersion,
    },
  };
}

export function ensureExportExtension(fileName: string): string {
  return fileName.toLowerCase().endsWith(DATA_EXPORT_EXTENSION)
    ? fileName
    : `${fileName}${DATA_EXPORT_EXTENSION}`;
}

function readFileRecord(value: unknown, entryPath: string): FileRecord {
  if (!isRecord(value) || value.path !== entryPath) {
    throw new DataTransferError('INVALID_ARCHIVE', 'File metadata path is invalid');
  }

  const sha256 = readString(value.sha256, 'sha256');
  if (!(/^[a-f0-9]{64}$/u).test(sha256)) {
    throw new DataTransferError('INVALID_ARCHIVE', 'File checksum is invalid');
  }

  return {
    path: entryPath,
    bytes: readInteger(value.bytes, 'bytes'),
    sha256,
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
