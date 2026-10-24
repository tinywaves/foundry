export const dataExportExtension = '.foundry-export';
export const dataExportArchiveVersion = 1;
export const dataExportSettingsVersion = 1;
export const dataExportPassphraseMinimumLength = 12;

export type DataTransferErrorCode
  = | 'ACTIVE_JOBS'
    | 'ARCHIVE_HAS_ACTIVE_JOBS'
    | 'BUSY'
    | 'IMPORT_NOT_FOUND'
    | 'INVALID_ARCHIVE'
    | 'INVALID_PASSPHRASE'
    | 'NEWER_SCHEMA'
    | 'UNSUPPORTED_ARCHIVE'
    | 'IO_ERROR';

export type DataTransferResult<T>
  = | { ok: true; data: T }
    | { ok: false; error: { code: DataTransferErrorCode; message: string } };

export type DataTransferStatus = {
  activeJobCount: number;
  isBusy: boolean;
};

export type ExportDataOutcome
  = | { status: 'canceled' }
    | {
      status: 'exported';
      filePath: string;
      providerCount: number;
      captureCount: number;
      jobCount: number;
    };

export type SelectImportFileOutcome
  = | { status: 'canceled' }
    | { status: 'selected'; filePath: string; fileName: string };

export type ImportPreview = {
  importId: string;
  fileName: string;
  exportedAt: string;
  appVersion: string;
  databaseSchemaVersion: number;
  settingsVersion: number;
  providerCount: number;
  captureCount: number;
  jobCount: number;
};

export type ImportCommitOutcome = {
  status: 'imported';
};
