'use client';

import * as React from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  AudioLinesIcon,
  ChevronsUpDownIcon,
  GalleryVerticalEndIcon,
  PlusIcon,
  TerminalIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { TranslationKey } from '@/i18n/resources';

const teams: Array<{
  id: string;
  nameKey: TranslationKey;
  logo: React.ReactNode;
  planKey: TranslationKey;
}> = [
  {
    id: 'acme-inc',
    nameKey: 'sidebar.team.acmeInc',
    logo: <GalleryVerticalEndIcon />,
    planKey: 'sidebar.plan.enterprise',
  },
  {
    id: 'acme-corp',
    nameKey: 'sidebar.team.acmeCorp',
    logo: <AudioLinesIcon />,
    planKey: 'sidebar.plan.startup',
  },
  {
    id: 'evil-corp',
    nameKey: 'sidebar.team.evilCorp',
    logo: <TerminalIcon />,
    planKey: 'sidebar.plan.free',
  },
];

export function TeamSwitcher() {
  const { t } = useTranslation();
  const { isMobile } = useSidebar();
  const [activeTeamId, setActiveTeamId] = React.useState(teams[0]?.id);
  const activeTeam = teams.find((team) => team.id === activeTeamId);

  if (!activeTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            )}
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {activeTeam.logo}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {t(activeTeam.nameKey)}
              </span>
              <span className="truncate text-xs">
                {t(activeTeam.planKey)}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t('sidebar.teams')}
              </DropdownMenuLabel>
              {teams.map((team, index) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => setActiveTeamId(team.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {team.logo}
                  </div>
                  {t(team.nameKey)}
                  <DropdownMenuShortcut>
                    ⌘
                    {index + 1}
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <PlusIcon className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  {t('sidebar.addTeam')}
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
