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
    <div className="flex min-h-svh flex-col gap-4 p-4">
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
  );
}
