import { LayoutDashboardIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link, useLocation } from 'react-router';

import { Button } from '#/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
} from '#/components/ui/empty';

export function NotFoundPage() {
  const location = useLocation();

  return (
    <Empty>
      <EmptyHeader className="max-w-md gap-3">
        <p
          aria-hidden="true"
          className="font-mono text-7xl font-semibold tracking-tighter text-muted-foreground/20"
        >
          404
        </p>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          This page doesn&apos;t exist
        </h1>
        <EmptyDescription>
          The address may be incorrect, or the page may have moved.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="gap-4">
        <p className="flex max-w-full items-center gap-2 text-muted-foreground">
          <span>Requested path</span>
          <code className="max-w-64 truncate rounded-md bg-muted px-2 py-1 font-mono text-foreground">
            {location.pathname}
          </code>
        </p>
        <Button
          nativeButton={false}
          render={
            (
              <Link
                to="/dashboard"
                data-testid="not-found-dashboard"
              />
            )
          }
        >
          <HugeiconsIcon
            icon={LayoutDashboardIcon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          Go to dashboard
        </Button>
      </EmptyContent>
    </Empty>
  );
}
