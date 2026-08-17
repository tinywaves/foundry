import { createContext, use } from 'react';
import type {
  ApplicationColorMode,
  ApplicationSettings,
} from '../../shared/settings-contract';

export interface ApplicationSettingsContextValue extends ApplicationSettings {
  updateColorMode: (colorMode: ApplicationColorMode) => void;
}

export const ApplicationSettingsContext
  = createContext<ApplicationSettingsContextValue | null>(null);

ApplicationSettingsContext.displayName = 'ApplicationSettingsContext';

export function useApplicationSettings(): ApplicationSettingsContextValue {
  const settings = use(ApplicationSettingsContext);
  if (settings === null) {
    throw new Error('useApplicationSettings must be used within ApplicationSettingsProvider.');
  }
  return settings;
}
