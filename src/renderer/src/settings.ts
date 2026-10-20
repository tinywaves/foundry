import type { LanguageMode, SettingsSnapshot, ThemeMode } from '../../shared/settings';

export type { LanguageMode, SettingsSnapshot, ThemeMode } from '../../shared/settings';

export const settingsKeys = {
  current: () => ['settings', 'current'] as const,
};

export function getSettings(): Promise<SettingsSnapshot> {
  return globalThis.api.settings.get() as Promise<SettingsSnapshot>;
}

export function setTheme(theme: ThemeMode): Promise<SettingsSnapshot> {
  return globalThis.api.settings.setTheme(theme) as Promise<SettingsSnapshot>;
}

export function setLanguage(language: LanguageMode): Promise<SettingsSnapshot> {
  return globalThis.api.settings.setLanguage(language) as Promise<SettingsSnapshot>;
}
