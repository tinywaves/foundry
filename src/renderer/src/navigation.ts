export type NavigationItem = {
  kind: 'item';
  id: string;
  label: string;
  href: string;
  icon: string;
};

export type NavigationSection = {
  kind: 'section';
  id: string;
  title: string;
  icon: string;
  items: readonly NavigationItem[];
};

export type NavigationNode = NavigationItem | NavigationSection;

export const sidebarNavigation: readonly NavigationNode[] = [
  {
    kind: 'item',
    id: 'overview',
    label: 'Overview',
    href: '/overview',
    icon: 'viewColumns',
  },
  {
    kind: 'section',
    id: 'library',
    title: 'Library',
    icon: 'copy',
    items: [
      {
        kind: 'item',
        id: 'prompts',
        label: 'Prompts',
        href: '/prompts',
        icon: 'menu',
      },
    ],
  },
  {
    kind: 'item',
    id: 'providers',
    label: 'Providers',
    href: '/providers',
    icon: 'copy',
  },
];

export const settingsNavigationItem: NavigationItem = {
  kind: 'item',
  id: 'settings',
  label: 'Settings',
  href: '/settings',
  icon: 'wrench',
};
