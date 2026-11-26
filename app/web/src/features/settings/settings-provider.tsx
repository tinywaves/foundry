import type { SettingsPayload, ThemeMode } from '@dhzh/foundry-shared';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';

import { getSettings, setTheme as setThemeRequest } from './api';
import { SettingsContext } from './settings-context';
import type { SettingsContextValue } from './settings-context';

type ResolvedTheme = 'light' | 'dark';

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const theme = settings?.workspace.appearance['color-theme'] ?? 'system';

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
        setError(null);
      } catch (error_) {
        if (isDisposed || controller.signal.aborted) {
          return;
        }
        setError(toErrorMessage(error_, 'Unable to load settings.'));
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

  const updateTheme = useCallback(async (nextTheme: ThemeMode) => {
    if (!settings || isUpdating || nextTheme === theme) {
      return;
    }

    const previousSettings = settings;
    setError(null);
    setIsUpdating(true);
    setSettings({
      ...settings,
      workspace: {
        ...settings.workspace,
        appearance: { 'color-theme': nextTheme },
      },
    });

    try {
      setSettings(await setThemeRequest(nextTheme));
    } catch (error_) {
      setSettings(previousSettings);
      setError(toErrorMessage(error_, 'Unable to update the color theme.'));
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, settings, theme]);

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    theme,
    isLoading,
    isUpdating,
    error,
    setTheme: updateTheme,
  }), [error, isLoading, isUpdating, settings, theme, updateTheme]);

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

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
