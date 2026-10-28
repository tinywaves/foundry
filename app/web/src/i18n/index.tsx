import { useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import i18n from 'i18next';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { InternationalizationProvider as AstryxInternationalizationProvider } from '@astryxdesign/core/i18n';
import zhCNMessages from '@astryxdesign/core/locales/zh-CN.generated.js';
import zhTWMessages from '@astryxdesign/core/locales/zh-TW.generated.js';
import jaJPMessages from '@astryxdesign/core/locales/ja-JP.generated.js';
import { useQuery } from '@tanstack/react-query';
import { getSettings, settingsKeys } from '../features/settings/api';
import type { LanguageMode } from '../features/settings/api';
import { resolveLocale, translations } from './messages';
import type { Locale, TranslationKey } from './messages';

export type { Locale, TranslationKey } from './messages';
export { captureErrorKey, dataTransferErrorKey } from './errors';

export interface I18nContextValue {
  locale: Locale;
  language: LanguageMode;
  t: (key: TranslationKey) => string;
}

export function useI18n(): I18nContextValue {
  const { t } = useTranslation();
  const language = (i18n.language || 'en-US') as Locale;
  const translate = useCallback((key: TranslationKey) => t(key), [t]);
  return useMemo(() => ({ locale: language, language, t: translate }), [language, translate]);
}

const resources = Object.fromEntries(
  Object.entries(translations).map(([locale, table]) => [locale, { translation: table }]),
);

if (!i18n.isInitialized) {
  void i18n.init({
    resources,
    lng: 'en-US',
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const settingsQuery = useQuery({ queryKey: settingsKeys.current(), queryFn: getSettings });
  const language = settingsQuery.data?.workspace['language-region'].language ?? 'system';
  const locale = useMemo(() => resolveLocale(language), [language]);

  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);

  return (
    <AstryxInternationalizationProvider
      locale={locale}
      messages={{
        'zh-CN': zhCNMessages,
        'zh-TW': zhTWMessages,
        'ja-JP': jaJPMessages,
      }}
    >
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </AstryxInternationalizationProvider>
  );
}
