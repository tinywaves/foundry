import type { LanguageMode, RegionCode, SettingsSnapshot, ThemeMode, TimeZoneCode } from '../../shared/settings';

export type { LanguageMode, RegionCode, SettingsSnapshot, ThemeMode, TimeZoneCode } from '../../shared/settings';

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

export function setRegion(region: RegionCode): Promise<SettingsSnapshot> {
  return globalThis.api.settings.setRegion(region) as Promise<SettingsSnapshot>;
}

export function setTimezone(timezone: TimeZoneCode): Promise<SettingsSnapshot> {
  return globalThis.api.settings.setTimezone(timezone) as Promise<SettingsSnapshot>;
}
