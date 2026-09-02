import {
  LayoutDashboardIcon,
  MessageProgrammingIcon,
} from '@hugeicons/core-free-icons';

export const sidebarNavigation = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboardIcon,
  },
  {
    title: 'Prompts',
    href: '/prompts',
    icon: MessageProgrammingIcon,
  },
] as const;

export function getPageTitle(pathname: string): string {
  return (
    sidebarNavigation.find((item) => item.href === pathname)?.title ?? 'Foundry'
  );
}
