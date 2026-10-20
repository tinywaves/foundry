import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import type { LanguageMode, RegionCode, SettingsSnapshot, ThemeMode, TimeZoneCode } from '../shared/settings';

export type { LanguageMode, RegionCode, ThemeMode, TimeZoneCode } from '../shared/settings';

export type FoundrySettings = SettingsSnapshot & {
  features?: Record<string, { provider?: string | null }>;
};

type StoredSettings = {
  workspace?: {
    'appearance'?: { 'color-theme'?: unknown };
    'language-region'?: {
      'language'?: unknown;
      'region-format'?: unknown;
      'time-zone'?: unknown;
    };
  };
  features?: FoundrySettings['features'];
};

export const DEFAULT_SETTINGS: FoundrySettings = {
  workspace: {
    'appearance': { 'color-theme': 'system' },
    'language-region': {
      'language': 'system',
      'region-format': 'US',
      'time-zone': 'America/Los_Angeles',
    },
  },
};

export function readSettings(settingsPath: string): FoundrySettings {
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, 'utf8')) as StoredSettings;
    const theme = parsed.workspace?.appearance?.['color-theme'];
    const language = parsed.workspace?.['language-region']?.language;
    const region = parsed.workspace?.['language-region']?.['region-format'];
    const timezone = parsed.workspace?.['language-region']?.['time-zone'];
    const supportedThemes: ThemeMode[] = ['light', 'dark', 'system'];
    const supportedLanguages: LanguageMode[] = ['system', 'en-US', 'zh-CN', 'zh-TW', 'ja-JP'];
    const supportedRegions: RegionCode[] = ['US', 'CN', 'TW', 'JP'];
    const supportedTimezones: TimeZoneCode[] = [
      'America/Los_Angeles',
      'America/New_York',
      'Asia/Shanghai',
      'Asia/Taipei',
      'Asia/Tokyo',
      'UTC',
    ];
    return {
      ...DEFAULT_SETTINGS,
      workspace: {
        'appearance': {
          'color-theme': supportedThemes.includes(theme as ThemeMode) ? theme as ThemeMode : 'system',
        },
        'language-region': {
          'language': supportedLanguages.includes(language as LanguageMode) ? language as LanguageMode : 'system',
          'region-format': supportedRegions.includes(region as RegionCode) ? region as RegionCode : 'US',
          'time-zone': supportedTimezones.includes(timezone as TimeZoneCode) ? timezone as TimeZoneCode : 'America/Los_Angeles',
        },
      },
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
  const settings = readSettings(settingsPath);
  return writeSettings(settingsPath, {
    ...settings,
    workspace: {
      ...settings.workspace,
      appearance: { 'color-theme': theme },
    },
  });
}

export function updateLanguage(settingsPath: string, language: LanguageMode): FoundrySettings {
  const settings = readSettings(settingsPath);
  return writeSettings(settingsPath, {
    ...settings,
    workspace: {
      ...settings.workspace,
      'language-region': {
        ...settings.workspace['language-region'],
        language,
      },
    },
  });
}

export function updateRegion(settingsPath: string, region: RegionCode): FoundrySettings {
  const settings = readSettings(settingsPath);
  return writeSettings(settingsPath, {
    ...settings,
    workspace: {
      ...settings.workspace,
      'language-region': {
        ...settings.workspace['language-region'],
        'region-format': region,
      },
    },
  });
}

export function updateTimezone(settingsPath: string, timezone: TimeZoneCode): FoundrySettings {
  const settings = readSettings(settingsPath);
  return writeSettings(settingsPath, {
    ...settings,
    workspace: {
      ...settings.workspace,
      'language-region': {
        ...settings.workspace['language-region'],
        'time-zone': timezone,
      },
    },
  });
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
