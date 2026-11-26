import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeftIcon } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { getPageTitle } from './navigation';

export function SettingsLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    const segments = pathname.split('/').filter(Boolean);
    const parentPath
      = segments.length > 1
        ? `/${segments.slice(0, -1).join('/')}`
        : '/dashboard';

    void navigate(parentPath);
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear">
        <div className="flex items-center gap-2 px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            className="-ml-1"
            onClick={handleBack}
          >
            <ArrowLeftIcon />
            <span className="sr-only">Go back</span>
          </Button>
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <span className="text-sm font-medium">{getPageTitle(pathname)}</span>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
