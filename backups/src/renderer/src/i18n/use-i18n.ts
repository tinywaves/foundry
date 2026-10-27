import { useCallback, useMemo } from 'react';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import type { LanguageMode } from '@renderer/apis/settings';
import type { Locale, TranslationKey } from './index';

export interface I18nContextValue {
  locale: Locale;
  language: LanguageMode;
  t: (key: TranslationKey) => string;
}

export function useI18n(): I18nContextValue {
  const { t } = useTranslation();
  const language = (i18n.language || 'en-US') as Locale;
  // Keep t stable for callers that use it in effect and callback dependencies.
  const translate = useCallback((key: TranslationKey) => t(key), [t]);
  return useMemo(
    () => ({
      locale: language,
      language,
      t: translate,
    }),
    [language, translate],
  );
}
