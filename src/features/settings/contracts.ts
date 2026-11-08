export const THEME_MODES = ['system', 'light', 'dark'] as const;
export const LANGUAGE_MODES = ['system', 'en-US', 'zh-CN', 'zh-TW', 'ja-JP'] as const;
export const TIME_FORMATS = [
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DD',
  'YYYY/MM/DD HH:mm:ss',
  'DD/MM/YYYY HH:mm:ss',
  'MM/DD/YYYY hh:mm:ss A',
  'HH:mm:ss',
] as const;
export const TIME_ZONES = [
  'America/Los_Angeles',
  'America/New_York',
  'Asia/Shanghai',
  'Asia/Taipei',
  'Asia/Tokyo',
  'UTC',
] as const;
export const FETCHER_TYPES = ['firecrawl'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
export type LanguageMode = (typeof LANGUAGE_MODES)[number];
export type TimeFormatPattern = (typeof TIME_FORMATS)[number];
export type TimeZoneCode = (typeof TIME_ZONES)[number];
export type FetcherType = (typeof FETCHER_TYPES)[number];

export interface CaptureSettings {
  fetcher: FetcherType | null;
  maxAttempts: number;
  fetchConcurrency: number;
  firecrawl: {
    apiKey: string;
  };
}

export interface FoundrySettings {
  workspace: {
    'appearance': {
      'color-theme': ThemeMode;
    };
    'language-region': {
      'language': LanguageMode;
      'time-format': TimeFormatPattern;
      'time-zone': TimeZoneCode;
    };
  };
  features: {
    library: {
      captures: CaptureSettings;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export interface PublicSettings {
  workspace: FoundrySettings['workspace'];
  features: {
    library: {
      captures: CaptureSettings;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export interface SettingsPatch {
  theme?: ThemeMode;
  language?: LanguageMode;
  timeFormat?: TimeFormatPattern;
  timezone?: TimeZoneCode;
  captures?: {
    fetcher?: FetcherType | null;
    maxAttempts?: number;
    fetchConcurrency?: number;
    firecrawlApiKey?: string;
  };
}

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
    library: {
      captures: {
        fetcher: null,
        maxAttempts: 1,
        fetchConcurrency: 2,
        firecrawl: { apiKey: '' },
      },
    },
  },
};

export function normalizeSettings(value: unknown): FoundrySettings {
  const root = isRecord(value) ? value : {};
  const workspace = isRecord(root.workspace) ? root.workspace : {};
  const appearance = isRecord(workspace.appearance) ? workspace.appearance : {};
  const languageRegion = isRecord(workspace['language-region'])
    ? workspace['language-region']
    : {};
  const features = isRecord(root.features) ? root.features : {};
  const library = isRecord(features.library) ? features.library : {};
  const captures = isRecord(library.captures) ? library.captures : {};
  const firecrawl = isRecord(captures.firecrawl) ? captures.firecrawl : {};

  return {
    workspace: {
      'appearance': {
        'color-theme': readEnum(
          appearance['color-theme'],
          THEME_MODES,
          DEFAULT_SETTINGS.workspace.appearance['color-theme'],
        ),
      },
      'language-region': {
        'language': readEnum(
          languageRegion.language,
          LANGUAGE_MODES,
          DEFAULT_SETTINGS.workspace['language-region'].language,
        ),
        'time-format': readEnum(
          languageRegion['time-format'],
          TIME_FORMATS,
          DEFAULT_SETTINGS.workspace['language-region']['time-format'],
        ),
        'time-zone': readEnum(
          languageRegion['time-zone'],
          TIME_ZONES,
          DEFAULT_SETTINGS.workspace['language-region']['time-zone'],
        ),
      },
    },
    features: {
      ...features,
      library: {
        ...library,
        captures: {
          fetcher: readFetcher(captures.fetcher),
          maxAttempts: readInteger(captures.maxAttempts, 10, 1),
          fetchConcurrency: readInteger(captures.fetchConcurrency, 5, 2),
          firecrawl: {
            apiKey: readString(firecrawl.apiKey),
          },
        },
      },
    },
  };
}

export function parseSettingsPatch(value: unknown): SettingsPatch {
  if (!isRecord(value)) {
    throw new SettingsInputError('Settings patch must be an object');
  }

  const patch: SettingsPatch = {};

  if ('theme' in value) {
    patch.theme = readRequiredEnum(value.theme, THEME_MODES, 'theme');
  }
  if ('language' in value) {
    patch.language = readRequiredEnum(value.language, LANGUAGE_MODES, 'language');
  }
  if ('timeFormat' in value) {
    patch.timeFormat = readRequiredEnum(value.timeFormat, TIME_FORMATS, 'timeFormat');
  }
  if ('timezone' in value) {
    patch.timezone = readRequiredEnum(value.timezone, TIME_ZONES, 'timezone');
  }
  if ('captures' in value) {
    patch.captures = parseCapturePatch(value.captures);
  }

  return patch;
}

export function applySettingsPatch(
  settings: FoundrySettings,
  patch: SettingsPatch,
): FoundrySettings {
  const captures = settings.features.library.captures;
  const capturePatch = patch.captures;

  return {
    workspace: {
      'appearance': {
        'color-theme': patch.theme ?? settings.workspace.appearance['color-theme'],
      },
      'language-region': {
        'language': patch.language ?? settings.workspace['language-region'].language,
        'time-format': patch.timeFormat
          ?? settings.workspace['language-region']['time-format'],
        'time-zone': patch.timezone
          ?? settings.workspace['language-region']['time-zone'],
      },
    },
    features: {
      ...settings.features,
      library: {
        ...settings.features.library,
        captures: {
          ...captures,
          fetcher: capturePatch?.fetcher === undefined
            ? captures.fetcher
            : capturePatch.fetcher,
          maxAttempts: capturePatch?.maxAttempts ?? captures.maxAttempts,
          fetchConcurrency:
            capturePatch?.fetchConcurrency ?? captures.fetchConcurrency,
          firecrawl: {
            apiKey: capturePatch?.firecrawlApiKey ?? captures.firecrawl.apiKey,
          },
        },
      },
    },
  };
}

export function toPublicSettings(settings: FoundrySettings): PublicSettings {
  const captures = settings.features.library.captures;

  return {
    workspace: settings.workspace,
    features: {
      ...settings.features,
      library: {
        ...settings.features.library,
        captures: {
          fetcher: captures.fetcher,
          maxAttempts: captures.maxAttempts,
          fetchConcurrency: captures.fetchConcurrency,
          firecrawl: {
            apiKey: captures.firecrawl.apiKey,
          },
        },
      },
    },
  };
}

export class SettingsInputError extends Error {
  readonly code = 'INVALID_SETTINGS_INPUT';

  constructor(message: string) {
    super(message);
    this.name = 'SettingsInputError';
  }
}

function parseCapturePatch(value: unknown): NonNullable<SettingsPatch['captures']> {
  if (!isRecord(value)) {
    throw new SettingsInputError('captures must be an object');
  }

  const patch: NonNullable<SettingsPatch['captures']> = {};

  if ('fetcher' in value) {
    patch.fetcher = value.fetcher === null
      ? null
      : readRequiredEnum(value.fetcher, FETCHER_TYPES, 'captures.fetcher');
  }
  if ('maxAttempts' in value) {
    patch.maxAttempts = readRequiredInteger(value.maxAttempts, 10, 'captures.maxAttempts');
  }
  if ('fetchConcurrency' in value) {
    patch.fetchConcurrency = readRequiredInteger(
      value.fetchConcurrency,
      5,
      'captures.fetchConcurrency',
    );
  }
  if ('firecrawlApiKey' in value) {
    patch.firecrawlApiKey = readTrimmedString(
      value.firecrawlApiKey,
      'captures.firecrawlApiKey',
    );
  }
  return patch;
}

function readFetcher(value: unknown): FetcherType | null {
  return readOptionalEnum(value, FETCHER_TYPES);
}

function readOptionalEnum<const T extends readonly string[]>(
  value: unknown,
  options: T,
): T[number] | null {
  return typeof value === 'string' && options.includes(value) ? value : null;
}

function readEnum<const T extends readonly string[]>(
  value: unknown,
  options: T,
  fallback: T[number],
): T[number] {
  return typeof value === 'string' && options.includes(value)
    ? value
    : fallback;
}

function readRequiredEnum<const T extends readonly string[]>(
  value: unknown,
  options: T,
  field: string,
): T[number] {
  if (typeof value !== 'string' || !options.includes(value)) {
    throw new SettingsInputError(`Invalid ${field}`);
  }

  return value;
}

function readInteger(
  value: unknown,
  maximum: number,
  fallback: number,
): number {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? Math.min(maximum, Math.max(1, value))
    : fallback;
}

function readRequiredInteger(
  value: unknown,
  maximum: number,
  field: string,
): number {
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value < 1
    || value > maximum
  ) {
    throw new SettingsInputError(`${field} must be an integer from 1 to ${maximum}`);
  }

  return value;
}

function readTrimmedString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new SettingsInputError(`${field} must be a string`);
  }

  return value.trim();
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
