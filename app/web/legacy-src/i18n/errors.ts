import type { CaptureErrorCode } from '../features/captures/types';
import type { DataTransferErrorCode } from '../features/data-transfer/types';
import type { TranslationKey } from './messages';

export function captureErrorKey(code: CaptureErrorCode): TranslationKey {
  switch (code) {
    case 'ACTIVE_JOB_EXISTS': {
      return 'captures.activeJobExists';
    }
    case 'DATA_TRANSFER_BUSY': {
      return 'captures.dataTransferBusy';
    }
    case 'FETCHER_NOT_CONFIGURED': {
      return 'captures.configureFetcherFirst';
    }
    case 'CAPTURE_ALREADY_EXISTS': {
      return 'captures.captureExists';
    }
    case 'CAPTURE_NOT_FOUND': {
      return 'captures.captureNotFound';
    }
    case 'INVALID_URL': {
      return 'captures.invalidUrl';
    }
  }
}

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
    case 'PASSPHRASE_REQUIRED': {
      return 'dataTransfer.passphraseRequired';
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
