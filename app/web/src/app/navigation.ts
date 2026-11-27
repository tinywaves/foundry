import {
  BotIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { TranslationKey } from '@/i18n/resources';

export type NavSubItem = {
  titleKey: TranslationKey;
  url: string;
};

export type NavItem = {
  titleKey: TranslationKey;
  url?: string;
  icon: LucideIcon;
  items?: NavSubItem[];
};

export const mainNavigation: NavItem[] = [
  {
    titleKey: 'nav.dashboard',
    url: '/dashboard',
    icon: LayoutDashboardIcon,
  },
  {
    titleKey: 'nav.library',
    icon: LibraryBigIcon,
    items: [
      {
        titleKey: 'nav.instructions',
        url: '/library/instructions',
      },
      {
        titleKey: 'nav.skills',
        url: '/library/skills',
      },
    ],
  },
  {
    titleKey: 'nav.models',
    icon: BotIcon,
    items: [
      {
        titleKey: 'nav.genesis',
        url: '/models/genesis',
      },
      {
        titleKey: 'nav.explorer',
        url: '/models/explorer',
      },
      {
        titleKey: 'nav.quantum',
        url: '/models/quantum',
      },
    ],
  },
];

const pageTitleKeys = new Map<string, TranslationKey>([
  ['/settings', 'nav.settings'],
  ...mainNavigation.flatMap((item) => [
    ...(item.url ? [[item.url, item.titleKey] as const] : []),
    ...(item.items?.map((subItem) => [subItem.url, subItem.titleKey] as const)
      ?? []),
  ]),
]);

export function getPageTitleKey(pathname: string): TranslationKey {
  return pageTitleKeys.get(pathname) ?? 'nav.dashboard';
}

const navigationPaths = mainNavigation.flatMap((item) => [
  ...(item.url ? [item.url] : []),
  ...(item.items?.map((subItem) => subItem.url) ?? []),
]);

export const mainRoutePaths = navigationPaths;
