import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import type {
  CaptureSettings,
  LanguageMode,
  LibrarySettings,
  SettingsFeatures,
  SettingsSnapshot,
  ThemeMode,
  TimeFormatPattern,
  TimeZoneCode,
} from '../shared/settings';

export type {
  CaptureSettings,
  LanguageMode,
  LibrarySettings,
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

const LEGACY_CAPTURE_SETTINGS_KEY = 'base';

const DEFAULT_CAPTURE_SETTINGS: CaptureSettings = {
  fetcher: null,
  maxAttempts: 1,
  scrapeConcurrency: 2,
  firecrawl: { apiKey: '' },
  deepseek: { apiKey: '' },
};

const DEFAULT_LIBRARY_SETTINGS: LibrarySettings = {
  captures: DEFAULT_CAPTURE_SETTINGS,
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
    library: DEFAULT_LIBRARY_SETTINGS,
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

function normalizeCaptureSettings(value: unknown): CaptureSettings {
  const captures = isRecord(value) ? value : {};
  const firecrawl = isRecord(captures.firecrawl) ? captures.firecrawl : {};
  const deepseek = isRecord(captures.deepseek) ? captures.deepseek : {};

  return {
    fetcher: captures.fetcher === 'firecrawl' || captures.fetcher === 'deepseek'
      ? captures.fetcher
      : null,
    maxAttempts: clampInteger(
      captures.maxAttempts,
      DEFAULT_CAPTURE_SETTINGS.maxAttempts,
      10,
    ),
    scrapeConcurrency: clampInteger(
      captures.scrapeConcurrency,
      DEFAULT_CAPTURE_SETTINGS.scrapeConcurrency,
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
  const legacyCaptureSettings = features[LEGACY_CAPTURE_SETTINGS_KEY];
  const currentFeatures = Object.fromEntries(
    Object.entries(features).filter(([key]) => key !== LEGACY_CAPTURE_SETTINGS_KEY),
  );
  const library = isRecord(currentFeatures.library) ? currentFeatures.library : {};
  const captureSettings = isRecord(library.captures)
    ? library.captures
    : legacyCaptureSettings;

  return {
    ...currentFeatures,
    library: {
      ...library,
      captures: normalizeCaptureSettings(captureSettings),
    },
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

export function updateLibrarySettings(
  settingsPath: string,
  patch: Partial<LibrarySettings>,
): FoundrySettings {
  const settings = readSettings(settingsPath);
  const current = settings.features.library;
  const currentCaptures = current.captures;
  const nextCaptures = patch.captures
    ? {
        ...currentCaptures,
        ...patch.captures,
        firecrawl: {
          ...currentCaptures.firecrawl,
          ...patch.captures.firecrawl,
        },
        deepseek: {
          ...currentCaptures.deepseek,
          ...patch.captures.deepseek,
        },
      }
    : currentCaptures;

  return writeSettings(settingsPath, {
    ...settings,
    features: {
      ...settings.features,
      library: {
        ...current,
        ...patch,
        captures: nextCaptures,
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
