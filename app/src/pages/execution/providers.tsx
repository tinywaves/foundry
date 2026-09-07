import type { ProviderRuntime, ProviderSummary } from '@dhzh/foundry-api-contract';
import { providerRuntimes } from '@dhzh/foundry-api-contract';
import {
  Activity03Icon,
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  Edit02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '#/components/ui/alert';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty';
import { Skeleton } from '#/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '#/components/ui/toggle-group';
import { useProviders } from '#/hooks/use-providers';

const runtimeLabels = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
} satisfies Record<ProviderRuntime, string>;

function isProviderRuntime(value: string | null): value is ProviderRuntime {
  return value !== null
    && providerRuntimes.includes(value as ProviderRuntime);
}

function ProviderCard({ provider }: { provider: ProviderSummary }) {
  return (
    <Card data-testid={`provider-${provider.id}`} size="sm">
      <CardHeader className="has-data-[slot=card-action]:grid-cols-1 @sm/card-header:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="lg">
            {provider.avatar
              ? (
                  <AvatarImage
                    alt=""
                    src={`data:${provider.avatar.mimeType};base64,${provider.avatar.data}`}
                  />
                )
              : null}
            <AvatarFallback>{provider.name.charAt(0) || 'P'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="truncate">{provider.name}</CardTitle>
            <CardDescription className="truncate">
              {provider.baseUrl}
            </CardDescription>
          </div>
        </div>
        <CardAction className="col-start-1 row-start-2 mt-2 flex flex-wrap items-center gap-1 justify-self-start @sm/card-header:col-start-2 @sm/card-header:row-span-2 @sm/card-header:row-start-1 @sm/card-header:mt-0 @sm/card-header:self-center @sm/card-header:justify-self-end">
          <Button aria-label={`Enable ${provider.name}`} type="button">
            Enable
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={(
                <Button
                  aria-label={`Edit ${provider.name}`}
                  size="icon"
                  type="button"
                  variant="ghost"
                />
              )}
            >
              <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={(
                <Button
                  aria-label={`Copy ${provider.name}`}
                  size="icon"
                  type="button"
                  variant="ghost"
                />
              )}
            >
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={(
                <Button
                  aria-label={`Test ${provider.name} connection`}
                  size="icon"
                  type="button"
                  variant="ghost"
                />
              )}
            >
              <HugeiconsIcon icon={Activity03Icon} strokeWidth={2} />
            </TooltipTrigger>
            <TooltipContent>Test connection</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={(
                <Button
                  aria-label={`Delete ${provider.name}`}
                  size="icon"
                  type="button"
                  variant="destructive"
                />
              )}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export function ProvidersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRuntime = searchParams.get('runtime');
  const runtime = isProviderRuntime(requestedRuntime)
    ? requestedRuntime
    : 'codex';
  const providers = useProviders(runtime);
  const returnTo = `/providers?runtime=${runtime}`;

  useEffect(() => {
    if (!isProviderRuntime(requestedRuntime)) {
      setSearchParams({ runtime }, { replace: true });
    }
  }, [requestedRuntime, runtime, setSearchParams]);

  return (
    <main className="flex w-full flex-col gap-5 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <ToggleGroup
          aria-label="Provider Runtime"
          spacing={0}
          value={[runtime]}
          variant="outline"
        >
          {providerRuntimes.map((providerRuntime) => (
            <ToggleGroupItem
              key={providerRuntime}
              nativeButton={false}
              render={<Link to={`/providers?runtime=${providerRuntime}`} />}
              value={providerRuntime}
            >
              {runtimeLabels[providerRuntime]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          className="ms-auto"
          nativeButton={false}
          render={(
            <Link
              to="/providers/new"
              state={{ returnTo }}
            />
          )}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
          Add Provider
        </Button>
      </header>

      {providers.isPending
        ? (
            <div
              className="flex flex-col gap-4"
              aria-label="Loading Providers"
              role="status"
            >
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )
        : null}

      {providers.isError
        ? (
            <Alert variant="destructive">
              <AlertTitle>Providers could not be loaded</AlertTitle>
              <AlertDescription>
                Check the Foundry Server and try again.
              </AlertDescription>
            </Alert>
          )
        : null}

      {providers.data?.length === 0
        ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>
                  No
                  {' '}
                  {runtimeLabels[runtime]}
                  {' '}
                  Providers
                </EmptyTitle>
                <EmptyDescription>
                  Add a Provider to verify the creation and listing flow.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        : null}

      {providers.data && providers.data.length > 0 && (
        <div className="flex flex-col gap-4">
          {providers.data.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}
    </main>
  );
}
