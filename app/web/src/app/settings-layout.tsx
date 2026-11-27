import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeftIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { getPageTitleKey } from './navigation';

export function SettingsLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    void navigate(-1);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header
        className="
          flex h-16 shrink-0 items-center gap-2 transition-[width,height]
          ease-linear
        "
      >
        <div className="flex items-center gap-2 px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            className="-ml-1"
            onClick={handleBack}
          >
            <ArrowLeftIcon />
            <span className="sr-only">{t('a11y.goBack')}</span>
          </Button>
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
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
