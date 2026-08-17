import type { ReactNode } from 'react';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import type {
  ApplicationColorMode,
  ApplicationSettings,
} from '../../shared/settings-contract';
import {
  ApplicationSettingsContext,
} from './application-settings-context';
import type {
  ApplicationSettingsContextValue,
} from './application-settings-context';
import { persistApplicationColorMode } from './application-settings-model';

interface ApplicationSettingsProviderProps {
  children: ReactNode;
  initialSettings: ApplicationSettings;
}

export function ApplicationSettingsProvider({
  children,
  initialSettings,
}: ApplicationSettingsProviderProps) {
  const [settings, setSettings] = useState(initialSettings);
  const updateColorMode = useCallback((colorMode: ApplicationColorMode) => {
    setSettings((current) => (
      current.colorMode === colorMode ? current : { ...current, colorMode }
    ));
    void persistApplicationColorMode(globalThis.api.settings, colorMode);
  }, []);
  const value = useMemo<ApplicationSettingsContextValue>(() => ({
    ...settings,
    updateColorMode,
  }), [settings, updateColorMode]);

  return (
    <ApplicationSettingsContext value={value}>
      {children}
    </ApplicationSettingsContext>
  );
}
