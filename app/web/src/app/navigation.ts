import {
  BotIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavSubItem = {
  title: string;
  url: string;
};

export type NavItem = {
  title: string;
  url?: string;
  icon: LucideIcon;
  items?: NavSubItem[];
};

export const mainNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboardIcon,
  },
  {
    title: 'Library',
    icon: LibraryBigIcon,
    items: [
      {
        title: 'Skills',
        url: '/library/skills',
      },
      {
        title: 'Starred',
        url: '/library/starred',
      },
    ],
  },
  {
    title: 'Models',
    icon: BotIcon,
    items: [
      {
        title: 'Genesis',
        url: '/models/genesis',
      },
      {
        title: 'Explorer',
        url: '/models/explorer',
      },
      {
        title: 'Quantum',
        url: '/models/quantum',
      },
    ],
  },
];

const pageTitles = new Map<string, string>([
  ['/settings', 'Settings'],
  ...mainNavigation.flatMap((item) => [
    ...(item.url ? [[item.url, item.title] as const] : []),
    ...(item.items?.map((subItem) => [subItem.url, subItem.title] as const)
      ?? []),
  ]),
]);

export function getPageTitle(pathname: string) {
  const exactTitle = pageTitles.get(pathname);
  if (exactTitle) {
    return exactTitle;
  }

  const lastSegment = pathname.split('/').findLast(Boolean);
  return lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : 'Dashboard';
}

const navigationPaths = mainNavigation.flatMap((item) => [
  ...(item.url ? [item.url] : []),
  ...(item.items?.map((subItem) => subItem.url) ?? []),
]);

export const mainRoutePaths = navigationPaths;
