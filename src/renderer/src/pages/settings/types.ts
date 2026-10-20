import type { ComponentType, SVGProps } from 'react';

export type PanelId = 'appearance' | 'language';
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
export interface PanelConfig { id: PanelId; label: string; description: string; icon: IconComponent }
export interface SettingsState {
  theme: 'system' | 'light' | 'dark';
  language: string;
  region: string;
  timezone: string;
}
export const INITIAL_SETTINGS: SettingsState = {
  theme: 'system',
  language: 'en-US',
  region: 'US',
  timezone: 'PT',
};
export type UpdateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
export interface PanelProps { settings: SettingsState; update: UpdateSetting }
export interface SearchableSetting { title: string; description: string; panel: PanelId; icon: IconComponent }
