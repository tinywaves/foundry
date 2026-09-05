import {
  BotIcon,
  ConnectIcon,
  LanguageSkillIcon,
  LayoutDashboardIcon,
  McpServerIcon,
  MessageProgrammingIcon,
} from '@hugeicons/core-free-icons';

export const sidebarNavigationSections = [
  {
    title: null,
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboardIcon,
      },
    ],
  },
  {
    title: 'Capabilities',
    items: [
      {
        title: 'Skills',
        href: '/skills',
        icon: LanguageSkillIcon,
      },
      {
        title: 'MCPs',
        href: '/mcps',
        icon: McpServerIcon,
      },
      {
        title: 'Prompts',
        href: '/prompts',
        icon: MessageProgrammingIcon,
      },
    ],
  },
  {
    title: 'Execution',
    items: [
      {
        title: 'Runtimes',
        href: '/runtimes',
        icon: BotIcon,
      },
      {
        title: 'Providers',
        href: '/providers',
        icon: ConnectIcon,
        description: 'Saved model-service connections for each Runtime.',
      },
    ],
  },
] as const;

export function getPageTitle(pathname: string): string {
  for (const section of sidebarNavigationSections) {
    for (const item of section.items) {
      if (item.href === pathname) {
        return item.title;
      }
    }
  }

  return 'Foundry';
}

export function getPageDescription(pathname: string): string | null {
  for (const section of sidebarNavigationSections) {
    for (const item of section.items) {
      if (item.href === pathname) {
        return 'description' in item ? item.description : null;
      }
    }
  }

  return null;
}
