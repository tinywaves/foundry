import type { CaptureErrorCode } from '../../../../shared/captures';
import type { TranslationKey } from '@renderer/i18n';

export function captureErrorKey(code: CaptureErrorCode): TranslationKey {
  switch (code) {
    case 'ACTIVE_JOB_EXISTS': {
      return 'captures.activeJobExists';
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
