import { Outlet, useLocation } from 'react-router';

import { AppSidebar } from '#/components/app-sidebar';
import { Separator } from '#/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar';
import { getPageTitle } from '#/navigation';

export function SidebarLayout() {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-10 shrink-0 items-center gap-2 px-3">
          <SidebarTrigger data-testid="sidebar-trigger" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs font-medium">{pageTitle}</span>
        </header>
        <Separator />
        <div className="flex flex-1 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
