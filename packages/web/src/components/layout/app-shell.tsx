import { Outlet, useLocation } from 'react-router';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/settings': 'Settings',
};

export function AppShell() {
  const { pathname } = useLocation();
  const pageTitle = pageTitles[pathname] ?? 'Foundry';

  return (
    <SidebarProvider className="h-dvh min-h-0 overflow-hidden">
      <TooltipProvider>
        <AppSidebar />
        <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
          <header
            className="flex h-12 shrink-0 items-center gap-2 border-b px-4"
          >
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="
                mx-1
                data-vertical:h-4
              "
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <Outlet />
          </div>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
