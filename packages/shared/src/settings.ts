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

export interface SettingsPayload extends PublicSettings {
  configFolder: string;
}
