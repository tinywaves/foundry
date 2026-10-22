import { appIcons } from './icons';
import type { AppIconName } from './icons';

export type NavigationItem = {
  kind: 'item';
  id: string;
  label: string;
  href: string;
  icon: (typeof appIcons)[AppIconName];
};

export type NavigationSection = {
  kind: 'section';
  id: string;
  title: string;
  icon: (typeof appIcons)[AppIconName];
  items: readonly NavigationItem[];
};

export type NavigationNode = NavigationItem | NavigationSection;

export const sidebarNavigation: readonly NavigationNode[] = [
  {
    kind: 'item',
    id: 'overview',
    label: 'Overview',
    href: '/overview',
    icon: appIcons.overview,
  },
  {
    kind: 'section',
    id: 'library',
    title: 'Library',
    icon: appIcons.library,
    items: [
      {
        kind: 'item',
        id: 'prompts',
        label: 'Prompts',
        href: '/prompts',
        icon: appIcons.prompts,
      },
    ],
  },
  {
    kind: 'item',
    id: 'base',
    label: 'Base',
    href: '/base/captures',
    icon: appIcons.base,
  },
  {
    kind: 'item',
    id: 'providers',
    label: 'Providers',
    href: '/providers',
    icon: appIcons.providers,
  },
];

export const settingsNavigationItem: NavigationItem = {
  kind: 'item',
  id: 'settings',
  label: 'Settings',
  href: '/settings',
  icon: appIcons.settings,
};
