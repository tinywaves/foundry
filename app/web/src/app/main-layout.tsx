import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router-dom';

import { getPageTitleKey } from './navigation';

export function MainLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header
          className="
            flex h-16 shrink-0 items-center gap-2 transition-[width,height]
            ease-linear
            group-has-data-[collapsible=icon]/sidebar-wrapper:h-12
          "
        >
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="
                mr-2
                data-vertical:h-4 data-vertical:self-auto
              "
            />
            <span className="text-sm font-medium">
              {t(getPageTitleKey(pathname))}
            </span>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
