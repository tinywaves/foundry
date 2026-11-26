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
import { NavLink, useLocation } from 'react-router-dom';

import type { NavItem } from '@/app/navigation';

export function NavMain({ items }: { items: NavItem[] }) {
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
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={pathname === item.url}
                  render={<NavLink to={item.url ?? '/dashboard'} />}
                >
                  <Icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          if (isIconCollapsed) {
            return (
              <SidebarMenuItem key={item.title}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={(
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={hasActiveChild}
                      />
                    )}
                  >
                    <Icon />
                    <span>{item.title}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-40"
                    side="right"
                    align="start"
                    sideOffset={4}
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                      {item.items.map((subItem) => (
                        <DropdownMenuItem
                          key={subItem.title}
                          className="cursor-pointer"
                          render={<NavLink to={subItem.url} />}
                        >
                          <span>{subItem.title}</span>
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
              key={`${item.title}-${hasActiveChild ? 'active' : 'inactive'}`}
              defaultOpen={hasActiveChild}
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger
                render={(
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={hasActiveChild}
                  />
                )}
              >
                <Icon />
                <span>{item.title}</span>
                <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        isActive={pathname === subItem.url}
                        render={<NavLink to={subItem.url} />}
                      >
                        <span>{subItem.title}</span>
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
