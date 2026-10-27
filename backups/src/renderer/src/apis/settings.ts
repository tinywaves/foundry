import type {
  LanguageMode,
  LibrarySettings,
  SettingsSnapshot,
  ThemeMode,
  TimeFormatPattern,
  TimeZoneCode,
} from '../../../shared/settings';

export type {
  CaptureSettings,
  FetcherType,
  LanguageMode,
  LibrarySettings,
  SettingsSnapshot,
  ThemeMode,
  TimeFormatPattern,
  TimeZoneCode,
} from '../../../shared/settings';

export const settingsKeys = {
  current: () => ['settings', 'current'] as const,
};

export function getSettings(): Promise<SettingsSnapshot> {
  return globalThis.api.settings.get() as Promise<SettingsSnapshot>;
}

export function getConfigFolder(): Promise<string> {
  return globalThis.api.settings.getConfigFolder();
}

export function openConfigFolder(): Promise<void> {
  return globalThis.api.settings.openConfigFolder();
}

export function setTheme(theme: ThemeMode): Promise<SettingsSnapshot> {
  return globalThis.api.settings.setTheme(theme) as Promise<SettingsSnapshot>;
}

export function setLanguage(language: LanguageMode): Promise<SettingsSnapshot> {
  return globalThis.api.settings.setLanguage(language) as Promise<SettingsSnapshot>;
}

export function setTimeFormat(timeFormat: TimeFormatPattern): Promise<SettingsSnapshot> {
  return globalThis.api.settings.setTimeFormat(timeFormat) as Promise<SettingsSnapshot>;
}

export function setTimezone(timezone: TimeZoneCode): Promise<SettingsSnapshot> {
  return globalThis.api.settings.setTimezone(timezone) as Promise<SettingsSnapshot>;
}

export function setLibrary(patch: Partial<LibrarySettings>): Promise<SettingsSnapshot> {
  return globalThis.api.settings.setLibrary(patch) as Promise<SettingsSnapshot>;
}
