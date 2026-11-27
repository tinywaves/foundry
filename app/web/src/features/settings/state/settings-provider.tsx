import type {
  LanguageMode,
  SettingsPayload,
  ThemeMode,
  TimeFormatPattern,
  TimeZoneCode,
} from '@dhzh/foundry-shared';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getSystemLanguage,
  i18n,
} from '@/i18n';
import type { TranslationKey } from '@/i18n/resources';

import { getSettings, updateSettings } from '../api';
import { SettingsContext } from './settings-context';
import type { SettingsContextValue } from './settings-context';

type ResolvedTheme = 'light' | 'dark';

export function SettingsProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const theme = settings?.workspace.appearance['color-theme'] ?? 'system';
  const language
    = settings?.workspace['language-region'].language ?? 'system';
  const timeFormat
    = settings?.workspace['language-region']['time-format']
      ?? 'YYYY-MM-DD HH:mm:ss';
  const timeZone
    = settings?.workspace['language-region']['time-zone']
      ?? 'America/Los_Angeles';
  const resolvedLanguage = language === 'system'
    ? getSystemLanguage()
    : language;

  useEffect(() => {
    const mediaQuery = matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isDisposed = false;

    async function loadSettings() {
      try {
        const nextSettings = await getSettings(controller.signal);
        if (isDisposed) {
          return;
        }
        setSettings(nextSettings);
        setErrorKey(null);
      } catch {
        if (isDisposed || controller.signal.aborted) {
          return;
        }
        setErrorKey('settings.errors.load');
      } finally {
        if (!isDisposed) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      isDisposed = true;
      controller.abort();
    };
  }, []);

  useLayoutEffect(() => {
    const resolvedTheme = theme === 'system' ? systemTheme : theme;
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
  }, [systemTheme, theme]);

  useEffect(() => {
    void i18n.changeLanguage(resolvedLanguage);
    document.documentElement.lang = resolvedLanguage;
  }, [resolvedLanguage]);

  const updateTheme = useCallback(async (nextTheme: ThemeMode) => {
    if (!settings || isUpdating || nextTheme === theme) {
      return;
    }

    const previousSettings = settings;
    setErrorKey(null);
    setIsUpdating(true);
    setSettings({
      ...settings,
      workspace: {
        ...settings.workspace,
        appearance: { 'color-theme': nextTheme },
      },
    });

    try {
      setSettings(await updateSettings({ theme: nextTheme }));
    } catch {
      setSettings(previousSettings);
      setErrorKey('settings.errors.theme');
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, settings, theme]);

  const updateLanguage = useCallback(async (nextLanguage: LanguageMode) => {
    if (!settings || isUpdating || nextLanguage === language) {
      return;
    }

    const previousSettings = settings;
    setErrorKey(null);
    setIsUpdating(true);
    setSettings({
      ...settings,
      workspace: {
        ...settings.workspace,
        'language-region': {
          ...settings.workspace['language-region'],
          language: nextLanguage,
        },
      },
    });

    try {
      setSettings(await updateSettings({ language: nextLanguage }));
    } catch {
      setSettings(previousSettings);
      setErrorKey('settings.errors.language');
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, language, settings]);

  const updateTimeZone = useCallback(async (nextTimeZone: TimeZoneCode) => {
    if (!settings || isUpdating || nextTimeZone === timeZone) {
      return;
    }

    const previousSettings = settings;
    setErrorKey(null);
    setIsUpdating(true);
    setSettings({
      ...settings,
      workspace: {
        ...settings.workspace,
        'language-region': {
          ...settings.workspace['language-region'],
          'time-zone': nextTimeZone,
        },
      },
    });

    try {
      setSettings(await updateSettings({ timezone: nextTimeZone }));
    } catch {
      setSettings(previousSettings);
      setErrorKey('settings.errors.timeZone');
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, settings, timeZone]);

  const updateTimeFormat = useCallback(
    async (nextTimeFormat: TimeFormatPattern) => {
      if (!settings || isUpdating || nextTimeFormat === timeFormat) {
        return;
      }

      const previousSettings = settings;
      setErrorKey(null);
      setIsUpdating(true);
      setSettings({
        ...settings,
        workspace: {
          ...settings.workspace,
          'language-region': {
            ...settings.workspace['language-region'],
            'time-format': nextTimeFormat,
          },
        },
      });

      try {
        setSettings(await updateSettings({ timeFormat: nextTimeFormat }));
      } catch {
        setSettings(previousSettings);
        setErrorKey('settings.errors.timeFormat');
      } finally {
        setIsUpdating(false);
      }
    },
    [isUpdating, settings, timeFormat],
  );

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    theme,
    language,
    timeFormat,
    timeZone,
    isLoading,
    isUpdating,
    error: errorKey ? t(errorKey) : null,
    setTheme: updateTheme,
    setLanguage: updateLanguage,
    setTimeFormat: updateTimeFormat,
    setTimeZone: updateTimeZone,
  }), [
    errorKey,
    isLoading,
    isUpdating,
    language,
    settings,
    t,
    theme,
    timeFormat,
    timeZone,
    updateLanguage,
    updateTheme,
    updateTimeFormat,
    updateTimeZone,
  ]);

  return (
    <SettingsContext value={value}>
      {children}
    </SettingsContext>
  );
}

function getSystemTheme(): ResolvedTheme {
  return matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
