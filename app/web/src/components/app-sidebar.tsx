'use client';

import * as React from 'react';

import { NavMain } from '@/components/nav-main';
import { TeamSwitcher } from '@/components/team-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { mainNavigation } from '@/app/navigation';
import {
  AudioLinesIcon,
  GalleryVerticalEndIcon,
  SettingsIcon,
  TerminalIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

// This is sample data.
const data = {
  teams: [
    {
      name: 'Acme Inc',
      logo: (
        <GalleryVerticalEndIcon />
      ),
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: (
        <AudioLinesIcon />
      ),
      plan: 'Startup',
    },
    {
      name: 'Evil Corp.',
      logo: (
        <TerminalIcon />
      ),
      plan: 'Free',
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mainNavigation} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              render={<NavLink to="/settings" />}
            >
              <SettingsIcon />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
