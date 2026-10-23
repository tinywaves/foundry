import type { ComponentType, SVGProps } from 'react';
import type {
  BaseSettings,
  LanguageMode,
  ThemeMode,
  TimeFormatPattern,
  TimeZoneCode,
} from '@renderer/apis/settings';

export type {
  BaseSettings,
  LanguageMode,
  ThemeMode,
  TimeFormatPattern,
  TimeZoneCode,
} from '@renderer/apis/settings';

export type PanelId = 'appearance' | 'language' | 'base' | 'advanced';
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
export interface PanelConfig { id: PanelId; label: string; description: string; icon: IconComponent }
export interface SettingsState {
  theme: ThemeMode;
  language: LanguageMode;
  timeFormat: TimeFormatPattern;
  timezone: TimeZoneCode;
  base: BaseSettings;
}
export const INITIAL_SETTINGS: SettingsState = {
  theme: 'system',
  language: 'system',
  timeFormat: 'YYYY-MM-DD HH:mm:ss',
  timezone: 'America/Los_Angeles',
  base: {
    fetcher: null,
    maxAttempts: 1,
    scrapeConcurrency: 2,
    firecrawl: { apiKey: '' },
    deepseek: { apiKey: '' },
  },
};
export type UpdateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
export interface PanelProps { settings: SettingsState; update: UpdateSetting }
export interface SearchableSetting { title: string; description: string; panel: PanelId; icon: IconComponent }
