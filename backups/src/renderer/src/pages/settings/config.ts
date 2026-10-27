import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BarsArrowUpIcon,
  BugAntIcon,
  ClockIcon,
  FolderIcon,
  GlobeAltIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';
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
        description: 'Data transfer and local configuration.',
        icon: AdjustmentsHorizontalIcon,
      },
    ],
  },
  {
    label: 'Features',
    panels: [
      {
        id: 'library',
        label: 'Library',
        description: 'Capture and prompt settings.',
        icon: FolderIcon,
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
  {
    title: 'Time format',
    description: 'Date and time structure used across Foundry',
    panel: 'language',
    icon: ClockIcon,
  },
  {
    title: 'Fetcher',
    description: 'Choose the service used to capture pages',
    panel: 'library',
    icon: BugAntIcon,
  },
  {
    title: 'Scrape concurrency',
    description: 'Limit simultaneous page fetches',
    panel: 'library',
    icon: BarsArrowUpIcon,
  },
  {
    title: 'Export data',
    description: 'Create an encrypted Foundry snapshot',
    panel: 'advanced',
    icon: ArrowUpTrayIcon,
  },
  {
    title: 'Import data',
    description: 'Restore data from an encrypted Foundry snapshot',
    panel: 'advanced',
    icon: ArrowDownTrayIcon,
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
