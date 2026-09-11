import {
  AiContentGenerator01Icon,
  ConnectIcon,
  LanguageSkillIcon,
  LayoutDashboardIcon,
  McpServerIcon,
  SquareTerminalIcon,
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
        icon: AiContentGenerator01Icon,
        description: 'Reusable text fragments for agent conversations.',
      },
    ],
  },
  {
    title: 'Execution',
    items: [
      {
        title: 'Runtimes',
        href: '/runtimes',
        icon: SquareTerminalIcon,
        description: 'Detection status and Provider assignments for each Runtime.',
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

function getNavigationItem(pathname: string) {
  for (const section of sidebarNavigationSections) {
    for (const item of section.items) {
      if (item.href === pathname || pathname.startsWith(`${item.href}/`)) {
        return item;
      }
    }
  }
}

export function getPageTitle(pathname: string): string {
  return getNavigationItem(pathname)?.title ?? 'Foundry';
}

export function getPageDescription(pathname: string): string | null {
  const item = getNavigationItem(pathname);
  return item && 'description' in item ? item.description : null;
}
