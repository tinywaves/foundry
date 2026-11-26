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
export type FetcherType = 'firecrawl';

export interface CaptureSettings {
  fetcher: FetcherType | null;
  maxAttempts: number;
  fetchConcurrency: number;
  firecrawl: {
    apiKey: string;
  };
}

export interface SettingsSnapshot {
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

export interface SettingsPayload extends SettingsSnapshot {
  configFolder: string;
}
