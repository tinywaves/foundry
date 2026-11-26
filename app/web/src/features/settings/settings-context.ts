import { createContext, use } from 'react';

import type { SettingsPayload, ThemeMode } from '../../shared/settings';

export interface SettingsContextValue {
  settings: SettingsPayload | null;
  theme: ThemeMode;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  setTheme: (theme: ThemeMode) => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);
SettingsContext.displayName = 'SettingsContext';

export function useSettings(): SettingsContextValue {
  const context = use(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used inside SettingsProvider.');
  }

  return context;
}
