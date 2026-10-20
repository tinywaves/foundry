import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import type { LanguageMode, SettingsSnapshot, ThemeMode } from '../shared/settings';

export type { LanguageMode, ThemeMode } from '../shared/settings';

export type FoundrySettings = SettingsSnapshot & {
  features?: Record<string, { provider?: string | null }>;
};

export const DEFAULT_SETTINGS: FoundrySettings = {
  appearance: { theme: 'system' },
  language: 'system',
};

export function readSettings(settingsPath: string): FoundrySettings {
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, 'utf8')) as Partial<FoundrySettings>;
    const theme = parsed.appearance?.theme;
    const language = parsed.language;
    const supportedThemes: ThemeMode[] = ['light', 'dark', 'system'];
    const supportedLanguages: LanguageMode[] = ['system', 'en-US', 'zh-CN', 'zh-TW', 'ja-JP'];
    return {
      ...DEFAULT_SETTINGS,
      appearance: {
        theme: supportedThemes.includes(theme!) ? theme! : 'system',
      },
      language: supportedLanguages.includes(language!) ? language! : 'system',
      ...(parsed.features && { features: parsed.features }),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settingsPath: string, settings: FoundrySettings): FoundrySettings {
  mkdirSync(path.dirname(settingsPath), { recursive: true });
  const temporaryPath = `${settingsPath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporaryPath, settingsPath);
  return settings;
}

export function updateSettings(settingsPath: string, theme: ThemeMode): FoundrySettings {
  return writeSettings(settingsPath, { ...readSettings(settingsPath), appearance: { theme } });
}

export function updateLanguage(settingsPath: string, language: LanguageMode): FoundrySettings {
  return writeSettings(settingsPath, { ...readSettings(settingsPath), language });
}

export function getCurrentUsedProviderIds(settingsPath: string): Set<string> {
  let settings: Pick<FoundrySettings, 'features'>;
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as Pick<FoundrySettings, 'features'>;
  } catch {
    return new Set();
  }

  const usedProviderIds = new Set<string>();
  const features = Object.values(settings.features ?? {});
  for (const feature of features) {
    if (typeof feature.provider === 'string' && feature.provider.trim()) {
      usedProviderIds.add(feature.provider);
    }
  }
  return usedProviderIds;
}
