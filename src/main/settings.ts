import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import type {
  BaseSettings,
  LanguageMode,
  SettingsFeatures,
  SettingsSnapshot,
  ThemeMode,
  TimeFormatPattern,
  TimeZoneCode,
} from '../shared/settings';

export type {
  BaseSettings,
  LanguageMode,
  ThemeMode,
  TimeFormatPattern,
  TimeZoneCode,
} from '../shared/settings';

export type FoundrySettings = SettingsSnapshot;

type StoredSettings = {
  workspace?: {
    'appearance'?: { 'color-theme'?: unknown };
    'language-region'?: {
      'language'?: unknown;
      'time-format'?: unknown;
      'time-zone'?: unknown;
    };
  };
  features?: unknown;
};

const DEFAULT_BASE_SETTINGS: BaseSettings = {
  fetcher: null,
  maxAttempts: 1,
  scrapeConcurrency: 2,
  firecrawl: { apiKey: '' },
  deepseek: { apiKey: '' },
};

export const DEFAULT_SETTINGS: FoundrySettings = {
  workspace: {
    'appearance': { 'color-theme': 'system' },
    'language-region': {
      'language': 'system',
      'time-format': 'YYYY-MM-DD HH:mm:ss',
      'time-zone': 'America/Los_Angeles',
    },
  },
  features: {
    base: DEFAULT_BASE_SETTINGS,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampInteger(value: unknown, fallback: number, maximum: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? Math.min(maximum, Math.max(1, value))
    : fallback;
}

function normalizeBaseSettings(value: unknown): BaseSettings {
  const base = isRecord(value) ? value : {};
  const firecrawl = isRecord(base.firecrawl) ? base.firecrawl : {};
  const deepseek = isRecord(base.deepseek) ? base.deepseek : {};

  return {
    fetcher: base.fetcher === 'firecrawl' || base.fetcher === 'deepseek' ? base.fetcher : null,
    maxAttempts: clampInteger(base.maxAttempts, DEFAULT_BASE_SETTINGS.maxAttempts, 10),
    scrapeConcurrency: clampInteger(
      base.scrapeConcurrency,
      DEFAULT_BASE_SETTINGS.scrapeConcurrency,
      5,
    ),
    firecrawl: {
      apiKey: typeof firecrawl.apiKey === 'string' ? firecrawl.apiKey : '',
    },
    deepseek: {
      apiKey: typeof deepseek.apiKey === 'string' ? deepseek.apiKey : '',
    },
  };
}

function normalizeFeatures(value: unknown): SettingsFeatures {
  const features = isRecord(value) ? value : {};
  return {
    ...features,
    base: normalizeBaseSettings(features.base),
  };
}

const TIME_FORMAT_PATTERNS = new Set<TimeFormatPattern>([
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DD',
  'YYYY/MM/DD HH:mm:ss',
  'DD/MM/YYYY HH:mm:ss',
  'MM/DD/YYYY hh:mm:ss A',
  'HH:mm:ss',
]);

function normalizeTimeFormatPattern(value: unknown): TimeFormatPattern {
  return typeof value === 'string' && TIME_FORMAT_PATTERNS.has(value as TimeFormatPattern)
    ? value as TimeFormatPattern
    : 'YYYY-MM-DD HH:mm:ss';
}

export function readSettings(settingsPath: string): FoundrySettings {
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, 'utf8')) as StoredSettings;
    const theme = parsed.workspace?.appearance?.['color-theme'];
    const language = parsed.workspace?.['language-region']?.language;
    const timeFormat = parsed.workspace?.['language-region']?.['time-format'];
    const timezone = parsed.workspace?.['language-region']?.['time-zone'];
    const supportedThemes: ThemeMode[] = ['light', 'dark', 'system'];
    const supportedLanguages: LanguageMode[] = ['system', 'en-US', 'zh-CN', 'zh-TW', 'ja-JP'];
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
          'time-format': normalizeTimeFormatPattern(timeFormat),
          'time-zone': supportedTimezones.includes(timezone as TimeZoneCode) ? timezone as TimeZoneCode : 'America/Los_Angeles',
        },
      },
      features: normalizeFeatures(parsed.features),
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

export function updateTimeFormat(
  settingsPath: string,
  timeFormat: TimeFormatPattern,
): FoundrySettings {
  const settings = readSettings(settingsPath);
  return writeSettings(settingsPath, {
    ...settings,
    workspace: {
      ...settings.workspace,
      'language-region': {
        ...settings.workspace['language-region'],
        'time-format': timeFormat,
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

export function updateBaseSettings(
  settingsPath: string,
  patch: Partial<BaseSettings>,
): FoundrySettings {
  const settings = readSettings(settingsPath);
  const current = settings.features.base;
  return writeSettings(settingsPath, {
    ...settings,
    features: {
      ...settings.features,
      base: {
        ...current,
        ...patch,
        firecrawl: {
          ...current.firecrawl,
          ...patch.firecrawl,
        },
        deepseek: {
          ...current.deepseek,
          ...patch.deepseek,
        },
      },
    },
  });
}

export function getCurrentUsedProviderIds(settingsPath: string): Set<string> {
  let settings: { features?: unknown };
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as { features?: unknown };
  } catch {
    return new Set();
  }

  const usedProviderIds = new Set<string>();
  const features = isRecord(settings.features) ? Object.values(settings.features) : [];
  for (const feature of features) {
    if (isRecord(feature) && typeof feature.provider === 'string' && feature.provider.trim()) {
      usedProviderIds.add(feature.provider);
    }
  }
  return usedProviderIds;
}
