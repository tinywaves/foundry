export type ThemeMode = 'system' | 'light' | 'dark';
export type LanguageMode = 'system' | 'en-US' | 'zh-CN' | 'zh-TW' | 'ja-JP';
export type RegionCode = 'US' | 'CN' | 'TW' | 'JP';

export type SettingsSnapshot = {
  appearance: {
    theme: ThemeMode;
  };
  language: LanguageMode;
  region: RegionCode;
};
