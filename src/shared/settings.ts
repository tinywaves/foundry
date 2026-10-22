export type ThemeMode = 'system' | 'light' | 'dark';
export type LanguageMode = 'system' | 'en-US' | 'zh-CN' | 'zh-TW' | 'ja-JP';
export type RegionCode = 'US' | 'CN' | 'TW' | 'JP';
export type TimeZoneCode
  = | 'America/Los_Angeles'
    | 'America/New_York'
    | 'Asia/Shanghai'
    | 'Asia/Taipei'
    | 'Asia/Tokyo'
    | 'UTC';

export type FetcherType = 'firecrawl' | 'deepseek';

export type BaseSettings = {
  fetcher: FetcherType | null;
  maxAttempts: number;
  scrapeConcurrency: number;
  firecrawl: {
    apiKey: string;
  };
  deepseek: {
    apiKey: string;
  };
};

export type SettingsFeatures = {
  base: BaseSettings;
  [key: string]: unknown;
};

export type SettingsSnapshot = {
  workspace: {
    'appearance': {
      'color-theme': ThemeMode;
    };
    'language-region': {
      'language': LanguageMode;
      'region-format': RegionCode;
      'time-zone': TimeZoneCode;
    };
  };
  features: SettingsFeatures;
};
