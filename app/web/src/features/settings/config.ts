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
import type { TranslationKey } from '../../i18n/messages';
import type { PanelConfig, PanelId, SearchableSetting } from './types';

export const PANEL_GROUPS: Array<{
  labelKey: TranslationKey;
  panels: PanelConfig[];
}> = [
  {
    labelKey: 'settings.workspace',
    panels: [
      {
        id: 'appearance',
        labelKey: 'settings.appearance',
        descriptionKey: 'settings.appearanceDescription',
        icon: PaintBrushIcon,
      },
      {
        id: 'language',
        labelKey: 'settings.languageRegion',
        descriptionKey: 'settings.languageRegionDescription',
        icon: GlobeAltIcon,
      },
      {
        id: 'advanced',
        labelKey: 'settings.advanced',
        descriptionKey: 'settings.advancedDescription',
        icon: AdjustmentsHorizontalIcon,
      },
    ],
  },
  {
    labelKey: 'settings.features',
    panels: [
      {
        id: 'library',
        labelKey: 'settings.library',
        descriptionKey: 'settings.libraryDescription',
        icon: FolderIcon,
      },
    ],
  },
];
export const PANELS = PANEL_GROUPS.flatMap((group) => group.panels);
export const DEFAULT_PANEL: PanelId = 'appearance';
export const SEARCHABLE_SETTINGS: SearchableSetting[] = [
  {
    id: 'color-theme',
    titleKey: 'settings.colorTheme',
    descriptionKey: 'settings.colorThemeDescription',
    panel: 'appearance',
    icon: PaintBrushIcon,
  },
  {
    id: 'time-zone',
    titleKey: 'settings.timezone',
    descriptionKey: 'settings.timezoneDescription',
    panel: 'language',
    icon: GlobeAltIcon,
  },
  {
    id: 'time-format',
    titleKey: 'settings.timeFormat',
    descriptionKey: 'settings.timeFormatDescription',
    panel: 'language',
    icon: ClockIcon,
  },
  {
    id: 'fetcher',
    titleKey: 'settings.capturesFetcher',
    descriptionKey: 'settings.capturesFetcherDescription',
    panel: 'library',
    icon: BugAntIcon,
  },
  {
    id: 'scrape-concurrency',
    titleKey: 'settings.capturesConcurrency',
    descriptionKey: 'settings.capturesConcurrencyDescription',
    panel: 'library',
    icon: BarsArrowUpIcon,
  },
  {
    id: 'export-data',
    titleKey: 'settings.exportData',
    descriptionKey: 'settings.exportDataDescription',
    panel: 'advanced',
    icon: ArrowUpTrayIcon,
  },
  {
    id: 'import-data',
    titleKey: 'settings.importData',
    descriptionKey: 'settings.importDataDescription',
    panel: 'advanced',
    icon: ArrowDownTrayIcon,
  },
];
export function panelConfig(id: PanelId): PanelConfig {
  return PANELS.find((panel) => panel.id === id) ?? PANELS[0];
}
export function isSettingMatch(
  setting: SearchableSetting,
  query: string,
  translate: (key: TranslationKey) => string,
): boolean {
  return [
    translate(setting.titleKey),
    translate(setting.descriptionKey),
    translate(panelConfig(setting.panel).labelKey),
  ].some((value) => value.toLowerCase().includes(query));
}
