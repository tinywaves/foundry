import { useLayoutEffect, useSyncExternalStore } from 'react';
import type { PropsWithChildren } from 'react';

import { getSystemLanguage, i18n } from '@/i18n';

import { useSettings } from './use-settings';
import { useSettingsRealtime } from './use-settings-realtime';

const systemThemeQuery = matchMedia('(prefers-color-scheme: dark)');
function subscribeSystemTheme(onChange: () => void) {
  systemThemeQuery.addEventListener('change', onChange);
  return () => systemThemeQuery.removeEventListener('change', onChange);
}
function getSystemTheme() {
  return systemThemeQuery.matches ? 'dark' : 'light';
}

export function SettingsProvider({ children }: PropsWithChildren) {
  useSettingsRealtime();
  const { theme, language } = useSettings();
  const systemTheme = useSyncExternalStore(subscribeSystemTheme, getSystemTheme);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  const resolvedLanguage = language === 'system' ? getSystemLanguage() : language;

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useLayoutEffect(() => {
    void i18n.changeLanguage(resolvedLanguage);
    document.documentElement.lang = resolvedLanguage;
  }, [resolvedLanguage]);

  return children;
}
