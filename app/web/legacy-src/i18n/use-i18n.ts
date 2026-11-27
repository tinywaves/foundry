import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageMode } from '@dhzh/foundry-shared';
import { i18n } from './instance';
import type { Locale, TranslationKey } from './messages';

export interface I18nContextValue {
  locale: Locale;
  language: LanguageMode;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

export function useI18n(): I18nContextValue {
  const { t } = useTranslation();
  const language = (i18n.language || 'en-US') as Locale;
  const translate = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) => t(key, values),
    [t],
  );
  return useMemo(() => ({ locale: language, language, t: translate }), [language, translate]);
}
