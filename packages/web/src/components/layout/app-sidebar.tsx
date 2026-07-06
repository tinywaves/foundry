import { LayoutDashboardIcon, SettingsIcon, WrenchIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const generalNavItems = [
  { title: 'Dashboard', to: '/dashboard', icon: LayoutDashboardIcon },
  { title: 'Settings', to: '/settings', icon: SettingsIcon },
] as const;

const toolsNavItems = [{ title: 'Tools', to: '/tools', icon: WrenchIcon }] as const;

function isNavItemActive(pathname: string, to: string) {
  if (to === '/tools') {
    return pathname.startsWith('/tools');
  }

  return pathname === to;
}

export function AppSidebar() {
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b">
        <div className="flex h-12 items-center px-2">
          <span
            className="
              truncate text-sm font-semibold
              group-data-[collapsible=icon]:hidden
            "
          >
            Foundry
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {generalNavItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    render={<NavLink to={item.to} />}
                    isActive={isNavItemActive(pathname, item.to)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNavItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    render={<NavLink to={item.to} />}
                    isActive={isNavItemActive(pathname, item.to)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
