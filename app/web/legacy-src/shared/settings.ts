export type ThemeMode = 'system' | 'light' | 'dark';
export type LanguageMode = 'system' | 'en-US' | 'zh-CN' | 'zh-TW' | 'ja-JP';
export type TimeFormatPattern
  = | 'YYYY-MM-DD HH:mm:ss'
    | 'YYYY-MM-DD'
    | 'YYYY/MM/DD HH:mm:ss'
    | 'DD/MM/YYYY HH:mm:ss'
    | 'MM/DD/YYYY hh:mm:ss A'
    | 'HH:mm:ss';
export type TimeZoneCode
  = | 'America/Los_Angeles'
    | 'America/New_York'
    | 'Asia/Shanghai'
    | 'Asia/Taipei'
    | 'Asia/Tokyo'
    | 'UTC';

export const FETCHER_TYPES = ['firecrawl'] as const;

export type FetcherType = (typeof FETCHER_TYPES)[number];

export type CaptureCredential = {
  apiKey: string;
};

export type CaptureSettings = {
  fetcher: FetcherType | null;
  maxAttempts: number;
  fetchConcurrency: number;
  firecrawl: CaptureCredential;
};

export type LibrarySettings = {
  captures: CaptureSettings;
  [key: string]: unknown;
};

export type SettingsFeatures = {
  library: LibrarySettings;
  [key: string]: unknown;
};

export type SettingsSnapshot = {
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
  features: SettingsFeatures;
};
