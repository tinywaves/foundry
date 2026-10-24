import type { DataTransferErrorCode } from '../../../../shared/data-transfer';
import type { TranslationKey } from '@renderer/i18n';

export function dataTransferErrorKey(code: DataTransferErrorCode): TranslationKey {
  switch (code) {
    case 'ACTIVE_JOBS': {
      return 'dataTransfer.activeJobs';
    }
    case 'ARCHIVE_HAS_ACTIVE_JOBS': {
      return 'dataTransfer.archiveHasActiveJobs';
    }
    case 'BUSY': {
      return 'dataTransfer.busy';
    }
    case 'IMPORT_NOT_FOUND': {
      return 'dataTransfer.importExpired';
    }
    case 'INVALID_PASSPHRASE': {
      return 'dataTransfer.invalidPassphrase';
    }
    case 'NEWER_SCHEMA': {
      return 'dataTransfer.newerVersion';
    }
    case 'UNSUPPORTED_ARCHIVE': {
      return 'dataTransfer.unsupportedArchive';
    }
    case 'INVALID_ARCHIVE': {
      return 'dataTransfer.invalidArchive';
    }
    case 'IO_ERROR': {
      return 'dataTransfer.ioError';
    }
  }
}
