import {
  DATA_EXPORT_ARCHIVE_VERSION,
  DATA_EXPORT_EXTENSION,
} from './contracts';
import { DataTransferError } from './errors';

export const DATA_EXPORT_FORMAT = 'foundry.snapshot';
export const DATA_ENTRY_PATH = 'data/foundry.json';
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
  data: FileRecord & {
    formatVersion: number;
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

  if (!isRecord(value.data) || value.database !== undefined || value.settings !== undefined) {
    throw new DataTransferError('INVALID_ARCHIVE', 'JSON data metadata is invalid');
  }
  return {
    format: DATA_EXPORT_FORMAT,
    archiveVersion,
    appVersion: readString(value.appVersion, 'appVersion'),
    createdAt,
    data: {
      ...readFileRecord(value.data, DATA_ENTRY_PATH),
      formatVersion: readInteger(value.data.formatVersion, 'data.formatVersion'),
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
