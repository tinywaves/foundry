import type {
  LanguageMode,
  SettingsPayload,
  ThemeMode,
  TimeZoneCode,
} from '@dhzh/foundry-shared';
import { createContext, use } from 'react';

export interface SettingsContextValue {
  settings: SettingsPayload | null;
  theme: ThemeMode;
  language: LanguageMode;
  timeZone: TimeZoneCode;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLanguage: (language: LanguageMode) => Promise<void>;
  setTimeZone: (timeZone: TimeZoneCode) => Promise<void>;
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
