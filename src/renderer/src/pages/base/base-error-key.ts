import type { BaseErrorCode } from '../../../../shared/base';
import type { TranslationKey } from '@renderer/i18n';

export function baseErrorKey(code: BaseErrorCode): TranslationKey {
  switch (code) {
    case 'ACTIVE_JOB_EXISTS': {
      return 'base.activeJobExists';
    }
    case 'BASE_NOT_CONFIGURED': {
      return 'base.configureFetcherFirst';
    }
    case 'CAPTURE_ALREADY_EXISTS': {
      return 'base.captureExists';
    }
    case 'CAPTURE_NOT_FOUND': {
      return 'base.captureNotFound';
    }
    case 'INVALID_URL': {
      return 'base.invalidUrl';
    }
  }
}
