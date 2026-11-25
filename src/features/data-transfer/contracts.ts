export const DATA_EXPORT_EXTENSION = '.foundry-backup';
export const DATA_EXPORT_ARCHIVE_VERSION = 3;
export const DATA_EXPORT_SETTINGS_VERSION = 1;

export type DataTransferErrorCode
  = | 'ACTIVE_JOBS'
    | 'ARCHIVE_HAS_ACTIVE_JOBS'
    | 'BUSY'
    | 'IMPORT_NOT_FOUND'
    | 'INVALID_ARCHIVE'
    | 'INVALID_PASSPHRASE'
    | 'NEWER_SCHEMA'
    | 'PASSPHRASE_REQUIRED'
    | 'UNSUPPORTED_ARCHIVE'
    | 'IO_ERROR';

export interface DataTransferStatus {
  activeJobCount: number;
  isBusy: boolean;
}

export interface ExportOutcome {
  filePath: string;
  providerCount: number;
  captureCount: number;
  jobCount: number;
}

export interface ImportPreview {
  importId: string;
  fileName: string;
  exportedAt: string;
  appVersion: string;
  dataFormatVersion: number;
  settingsVersion: number;
  providerCount: number;
  captureCount: number;
  jobCount: number;
}
