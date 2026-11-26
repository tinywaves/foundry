import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { ChevronRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';

import type { NavItem } from '@/app/navigation';

export function NavMain({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { isMobile, state } = useSidebar();
  const isIconCollapsed = state === 'collapsed' && !isMobile;

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;
          const hasActiveChild
            = item.items?.some((subItem) => subItem.url === pathname) ?? false;

          if (!item.items) {
            return (
              <SidebarMenuItem key={item.titleKey}>
                <SidebarMenuButton
                  tooltip={t(item.titleKey)}
                  isActive={pathname === item.url}
                  render={<NavLink to={item.url ?? '/dashboard'} />}
                >
                  <Icon />
                  <span>{t(item.titleKey)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          if (isIconCollapsed) {
            return (
              <SidebarMenuItem key={item.titleKey}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={(
                      <SidebarMenuButton
                        tooltip={t(item.titleKey)}
                        isActive={hasActiveChild}
                      />
                    )}
                  >
                    <Icon />
                    <span>{t(item.titleKey)}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-40"
                    side="right"
                    align="start"
                    sideOffset={4}
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>
                        {t(item.titleKey)}
                      </DropdownMenuLabel>
                      {item.items.map((subItem) => (
                        <DropdownMenuItem
                          key={subItem.titleKey}
                          className="cursor-pointer"
                          render={<NavLink to={subItem.url} />}
                        >
                          <span>{t(subItem.titleKey)}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible
              key={`${item.titleKey}-${hasActiveChild ? 'active' : 'inactive'}`}
              defaultOpen={hasActiveChild}
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger
                render={(
                  <SidebarMenuButton
                    tooltip={t(item.titleKey)}
                    isActive={hasActiveChild}
                  />
                )}
              >
                <Icon />
                <span>{t(item.titleKey)}</span>
                <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.titleKey}>
                      <SidebarMenuSubButton
                        isActive={pathname === subItem.url}
                        render={<NavLink to={subItem.url} />}
                      >
                        <span>{t(subItem.titleKey)}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
