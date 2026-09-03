import { Settings01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { AppSidebar } from '#/components/app-sidebar';
import { Button } from '#/components/ui/button';
import { Separator } from '#/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar';
import { getPageTitle } from '#/navigation';

export function SidebarLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-10 shrink-0 items-center gap-2 px-3">
          <SidebarTrigger data-testid="sidebar-trigger" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs font-medium">{pageTitle}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ms-auto"
            aria-label="Settings"
            data-testid="settings-button"
            onClick={() => navigate('/settings', { state: { returnTo } })}
          >
            <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
          </Button>
        </header>
        <Separator />
        <div className="flex flex-1 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
