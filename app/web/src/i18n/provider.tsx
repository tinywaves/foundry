import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getSettings, settingsKeys } from '../features/settings/api';
import { i18n } from './instance';
import { resolveLocale } from './messages';

export function I18nProvider({ children }: {
  children: ReactNode;
}) {
  const settingsQuery = useQuery({ queryKey: settingsKeys.current(), queryFn: getSettings });
  const language = settingsQuery.data?.workspace['language-region'].language ?? 'system';
  const locale = useMemo(() => resolveLocale(language), [language]);
  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
