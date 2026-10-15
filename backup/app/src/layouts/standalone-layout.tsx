import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link, Outlet, useLocation } from 'react-router';

import { buttonVariants } from '#/components/ui/button';

export function StandaloneLayout() {
  const location = useLocation();
  const returnTo = typeof location.state?.returnTo === 'string'
    ? location.state.returnTo
    : '/dashboard';

  return (
    <div className="min-h-svh p-4">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-2xl flex-col gap-4">
        <Link
          to={returnTo}
          replace
          className={buttonVariants({
            variant: 'link',
            size: 'sm',
            className: '-ms-2 self-start',
          })}
          data-testid="standalone-back"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          Back
        </Link>
        <div className="flex flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
