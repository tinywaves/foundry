import type { ComponentType, SVGProps } from 'react';
import type { LanguageMode, RegionCode, ThemeMode, TimeZoneCode } from '@renderer/settings';

export type { LanguageMode, RegionCode, ThemeMode, TimeZoneCode } from '@renderer/settings';

export type PanelId = 'appearance' | 'language' | 'advanced';
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
export interface PanelConfig { id: PanelId; label: string; description: string; icon: IconComponent }
export interface SettingsState {
  theme: ThemeMode;
  language: LanguageMode;
  region: RegionCode;
  timezone: TimeZoneCode;
}
export const INITIAL_SETTINGS: SettingsState = {
  theme: 'system',
  language: 'system',
  region: 'US',
  timezone: 'America/Los_Angeles',
};
export type UpdateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
export interface PanelProps { settings: SettingsState; update: UpdateSetting }
export interface SearchableSetting { title: string; description: string; panel: PanelId; icon: IconComponent }
