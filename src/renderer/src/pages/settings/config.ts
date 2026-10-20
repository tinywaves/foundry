import { AdjustmentsHorizontalIcon, GlobeAltIcon, PaintBrushIcon } from '@heroicons/react/24/outline';
import type { PanelConfig, PanelId, SearchableSetting } from './types';

export const PANEL_GROUPS: Array<{ label: string; panels: PanelConfig[] }> = [
  {
    label: 'Workspace',
    panels: [
      {
        id: 'appearance',
        label: 'Appearance',
        description: 'Theme and density for this browser.',
        icon: PaintBrushIcon,
      },
      {
        id: 'language',
        label: 'Language & region',
        description: 'Language, formats, and time zone.',
        icon: GlobeAltIcon,
      },
      {
        id: 'advanced',
        label: 'Advanced',
        description: 'Open the settings file.',
        icon: AdjustmentsHorizontalIcon,
      },
    ],
  },
];
export const PANELS = PANEL_GROUPS.flatMap((group) => group.panels);
export const DEFAULT_PANEL: PanelId = 'appearance';
export const SEARCHABLE_SETTINGS: SearchableSetting[] = [
  {
    title: 'Color theme',
    description: 'Light, dark, or follow the system',
    panel: 'appearance',
    icon: PaintBrushIcon,
  },
  {
    title: 'Time zone',
    description: 'Used for scheduling and timestamps',
    panel: 'language',
    icon: GlobeAltIcon,
  },
];
export function panelConfig(id: PanelId): PanelConfig {
  return PANELS.find((panel) => panel.id === id) ?? PANELS[0];
}
export function isSettingMatch(setting: SearchableSetting, query: string): boolean {
  return [
    setting.title,
    setting.description,
    panelConfig(setting.panel).label,
  ].some((value) => value.toLowerCase().includes(query));
}
