import type {
  Provider,
  ProviderRuntime,
} from '@dhzh/foundry-api-contract';
import { providerRuntimes } from '@dhzh/foundry-api-contract';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';

import { SecretInput } from '#/components/secret-input';
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
  CardContent,
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

function ProviderCard({ provider }: { provider: Provider }) {
  const { apiKey, ...visibleConfiguration } = provider.configuration;

  return (
    <Card data-testid={`provider-${provider.id}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
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
            <CardTitle>{provider.name}</CardTitle>
            <CardDescription>{runtimeLabels[provider.runtime]}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <dt className="font-medium">ID</dt>
          <dd className="break-all font-mono">{provider.id}</dd>
          <dt className="font-medium">Official website</dt>
          <dd>
            {provider.officialWebsite
              ? (
                  <a
                    className="underline underline-offset-4"
                    href={provider.officialWebsite}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {provider.officialWebsite}
                  </a>
                )
              : '—'}
          </dd>
          <dt className="font-medium">Remark</dt>
          <dd className="whitespace-pre-wrap">{provider.remark ?? '—'}</dd>
          <dt className="font-medium">Created</dt>
          <dd>{new Date(provider.createdAt).toLocaleString()}</dd>
          <dt className="font-medium">Updated</dt>
          <dd>{new Date(provider.updatedAt).toLocaleString()}</dd>
        </dl>

        <div className="flex flex-col gap-2">
          <p className="font-medium">API Key</p>
          <SecretInput aria-label={`${provider.name} API Key`} readOnly value={apiKey ?? ''} />
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-medium">Configuration</p>
          <pre className="max-w-full overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
            {JSON.stringify(visibleConfiguration, null, 2)}
          </pre>
        </div>
      </CardContent>
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
            <div className="flex flex-col gap-3" aria-label="Loading Providers" role="status">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
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

      {providers.data?.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </main>
  );
}
