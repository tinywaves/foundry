import { Link, Outlet, useLocation } from 'react-router';
import { AppSidebar } from '@/components/layout/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getToolById } from '@/tools/registry';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/settings': 'Settings',
  '/tools': 'Tools',
};

function AppBreadcrumb() {
  const { pathname } = useLocation();

  if (pathname.startsWith('/tools/')) {
    const toolId = pathname.slice('/tools/'.length);
    const tool = getToolById(toolId);

    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/tools" />}>Tools</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tool?.name ?? 'Tool'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const pageTitle = pageTitles[pathname] ?? 'Foundry';

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AppShell() {
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
            <AppBreadcrumb />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <Outlet />
          </div>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
