import type { ApplicationColorMode } from '@dhzh/foundry-api-contract';
import * as React from 'react';

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert';
import { Button } from '#/components/ui/button';
import { Spinner } from '#/components/ui/spinner';
import { useSettingsQuery } from '#/hooks/use-settings';

type ResolvedTheme = 'dark' | 'light';

interface ThemeProviderProps {
  children: React.ReactNode;
  disableTransitionOnChange?: boolean;
}

interface ThemeProviderState {
  resolvedTheme: ResolvedTheme;
  theme: ApplicationColorMode;
}

const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(
  undefined,
);

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? 'dark' : 'light';
}

function disableTransitionsTemporarily() {
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(
    '*,*::before,*::after{-webkit-transition:none!important;transition:none!important}',
  ));
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove();
      });
    });
  };
}

function applyDocumentTheme(
  theme: ApplicationColorMode,
  disableTransitionOnChange: boolean,
): ResolvedTheme {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  const restoreTransitions = disableTransitionOnChange
    ? disableTransitionsTemporarily()
    : null;

  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(resolvedTheme);
  restoreTransitions?.();

  return resolvedTheme;
}

export function ThemeProvider({
  children,
  disableTransitionOnChange = true,
}: ThemeProviderProps) {
  const settingsQuery = useSettingsQuery();
  const theme = settingsQuery.data?.colorMode ?? 'system';
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(
    getSystemTheme,
  );

  React.useLayoutEffect(() => {
    localStorage.removeItem('theme');
    setResolvedTheme(applyDocumentTheme(theme, disableTransitionOnChange));

    if (theme !== 'system') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
    const handleChange = () => {
      setResolvedTheme(applyDocumentTheme('system', disableTransitionOnChange));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [disableTransitionOnChange, theme]);

  if (settingsQuery.isPending) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner aria-label="Loading Foundry" />
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <main className="grid min-h-svh place-items-center p-4">
        <Alert variant="destructive" className="max-w-sm">
          <AlertTitle>Unable to load Foundry</AlertTitle>
          <AlertDescription>
            Application Settings could not be loaded.
          </AlertDescription>
          <Button
            className="mt-2 justify-self-start"
            size="sm"
            variant="outline"
            onClick={() => settingsQuery.refetch()}
          >
            Retry
          </Button>
        </Alert>
      </main>
    );
  }

  return (
    <ThemeProviderContext.Provider value={{ resolvedTheme, theme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeProviderContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
