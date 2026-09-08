import type {
  ProviderRuntime,
  ProviderSummary,
  RuntimeConfigurationPreviewField,
  RuntimeConfigurationPreviewValue,
  RuntimeConfigurationTarget,
  RuntimeSummary,
} from '@dhzh/foundry-api-contract';
import {
  providerRuntimeLabels,
  runtimeManagedFieldReferences,
} from '@dhzh/foundry-api-contract';
import { EyeIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ProviderAvatar } from '#/components/provider-avatar';
import { RuntimeIcon, RuntimeOption } from '#/components/runtime-option';
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { Skeleton } from '#/components/ui/skeleton';
import { Spinner } from '#/components/ui/spinner';
import { toast } from '#/components/ui/toast';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip';
import { useProviders } from '#/hooks/use-providers';
import {
  RuntimeRequestError,
  useApplyRuntimeConfiguration,
  usePreviewRuntimeConfiguration,
  useRuntimes,
} from '#/hooks/use-runtimes';

const officialDefaultValue = 'official-default';

function RuntimeMetadataValue({ value }: { value: string }) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = valueRef.current;
    if (!element) {
      return;
    }

    const updateTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    };

    const frame = requestAnimationFrame(updateTruncation);
    const observer = new ResizeObserver(updateTruncation);
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value]);

  return (
    <dd className="min-w-0">
      <Tooltip disabled={!isTruncated}>
        <TooltipTrigger
          render={(
            <span
              ref={valueRef}
              className="block truncate font-mono text-foreground"
              tabIndex={isTruncated ? 0 : undefined}
            />
          )}
        >
          {value}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm break-all">
          <code className="font-mono">{value}</code>
        </TooltipContent>
      </Tooltip>
    </dd>
  );
}

function OfficialDefaultOption({ runtime }: { runtime: ProviderRuntime }) {
  return (
    <>
      <RuntimeIcon runtime={runtime} size={24} />
      <span className="truncate">Official Default</span>
    </>
  );
}

function ProviderSelectOption({ provider }: { provider: ProviderSummary }) {
  return (
    <>
      <ProviderAvatar avatar={provider.avatar} name={provider.name} size="sm" />
      <span className="truncate">{provider.name}</span>
    </>
  );
}

function SelectedProviderValue({
  isPending,
  provider,
  runtime,
  selection,
}: {
  isPending: boolean;
  provider: ProviderSummary | undefined;
  runtime: ProviderRuntime;
  selection: string;
}) {
  if (selection === officialDefaultValue) {
    return <OfficialDefaultOption runtime={runtime} />;
  }
  if (provider) {
    return <ProviderSelectOption provider={provider} />;
  }
  return isPending ? 'Loading Providers...' : 'Provider unavailable';
}

function selectedTarget(value: string): RuntimeConfigurationTarget {
  return value === officialDefaultValue
    ? { kind: 'official-default' }
    : { kind: 'provider', providerId: value };
}

function displayError(error: unknown, title: string): void {
  toast.add({
    description: error instanceof RuntimeRequestError
      ? error.message
      : 'An unexpected error occurred.',
    priority: 'high',
    title,
    type: 'error',
  });
}

function PreviewValue({ value }: { value: RuntimeConfigurationPreviewValue }) {
  const [revealed, setRevealed] = useState(false);
  if (value.kind === 'absent') {
    return <code className="text-muted-foreground">null</code>;
  }
  if (value.kind === 'plain') {
    return <code className="break-all">{JSON.stringify(value.value)}</code>;
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <code className="break-all">
        {revealed ? JSON.stringify(value.value) : '••••••••'}
      </code>
      <Button
        aria-label={revealed ? 'Hide API Key' : 'Show API Key'}
        size="icon-xs"
        variant="ghost"
        onClick={() => setRevealed((visible) => !visible)}
      >
        <HugeiconsIcon
          icon={revealed ? ViewOffSlashIcon : EyeIcon}
          strokeWidth={2}
        />
      </Button>
    </span>
  );
}

function PreviewField({ field }: { field: RuntimeConfigurationPreviewField }) {
  return (
    <div className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
      <div className="min-w-0">
        <code className="mb-1 block break-all text-[0.6875rem] text-muted-foreground">
          {field.key}
        </code>
        <PreviewValue value={field.current} />
      </div>
      <span aria-hidden="true" className="text-muted-foreground">→</span>
      <div className="min-w-0">
        <span className="mb-1 block text-[0.6875rem] uppercase tracking-wide text-muted-foreground">
          {field.operation}
        </span>
        <PreviewValue value={field.proposed} />
      </div>
    </div>
  );
}

function PreviewFields({ fields }: { fields: RuntimeConfigurationPreviewField[] }) {
  if (fields.length === 0) {
    return <p className="text-muted-foreground">No fields in this section.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {fields.map((field) => <PreviewField field={field} key={field.key} />)}
    </div>
  );
}

function ManagedFieldsDialog({
  isOpen,
  runtime,
  onOpenChange,
}: {
  isOpen: boolean;
  runtime: ProviderRuntime;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const fields = runtimeManagedFieldReferences[runtime];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RuntimeIcon runtime={runtime} />
            <span>
              {providerRuntimeLabels[runtime]}
              {' fields managed by Foundry'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {fields.length}
            {' '}
            configuration fields
          </DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {fields.map((field) => (
            <li key={field}>
              <code className="block break-all rounded bg-muted px-2 py-1 text-[0.6875rem]">
                {field}
              </code>
            </li>
          ))}
        </ul>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

export function RuntimePreviewDialog({
  isOpen,
  runtime,
  target,
  onOpenChange,
}: {
  isOpen: boolean;
  runtime: ProviderRuntime;
  target: RuntimeConfigurationTarget;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const previewRequest = usePreviewRuntimeConfiguration(runtime);
  const applyRequest = useApplyRuntimeConfiguration(runtime);
  const mutatePreview = previewRequest.mutate;
  const [providerKeys, setProviderKeys] = useState<string[]>([]);
  const [providerKey, setProviderKey] = useState<string | undefined>();

  const refresh = (nextProviderKey = providerKey) => {
    mutatePreview(
      { providerKey: nextProviderKey, target },
      {
        onError: (error) => displayError(error, 'Preview failed'),
        onSuccess: (preview) => {
          if (preview.kind === 'provider-key-selection') {
            setProviderKeys(preview.providerKeys);
          }
        },
      },
    );
  };

  const preview = previewRequest.data;
  const readyPreview = preview?.kind === 'ready' ? preview : null;

  useEffect(() => {
    mutatePreview(
      { target },
      {
        onError: (error) => displayError(error, 'Preview failed'),
        onSuccess: (nextPreview) => {
          if (nextPreview.kind === 'provider-key-selection') {
            setProviderKeys(nextPreview.providerKeys);
          }
        },
      },
    );
  }, [mutatePreview, target]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Preview Changes</DialogTitle>
          <DialogDescription>
            Review every field Foundry manages before applying this Runtime configuration.
          </DialogDescription>
        </DialogHeader>

        {previewRequest.isPending && (
          <div className="flex items-center gap-2 py-8 text-muted-foreground" role="status">
            <Spinner />
            Reading Runtime configuration…
          </div>
        )}

        {preview && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border bg-muted/30 p-3">
              <span className="block text-muted-foreground">Configuration file</span>
              <code className="break-all">{preview.file.path}</code>
            </div>

            {providerKeys.length > 1 && (
              <div className="flex flex-col gap-2">
                <label className="font-medium" htmlFor={`${runtime}-provider-key`}>
                  Codex Provider key
                </label>
                <Select
                  id={`${runtime}-provider-key`}
                  value={providerKey}
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }

                    setProviderKey(value);
                    refresh(value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a Provider key" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {providerKeys.map((key) => (
                        <SelectItem key={key} value={key}>
                          <code>{key}</code>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {readyPreview && (
              <>
                <section className="flex flex-col gap-2">
                  <h3 className="font-medium">Changes</h3>
                  <PreviewFields fields={readyPreview.changes} />
                </section>
                <Collapsible>
                  <CollapsibleTrigger
                    render={<Button className="w-full justify-between" variant="outline" />}
                  >
                    Unchanged managed fields
                    <span>{readyPreview.unchanged.length}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <PreviewFields fields={readyPreview.unchanged} />
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            disabled={previewRequest.isPending || applyRequest.isPending}
            variant="outline"
            onClick={() => refresh()}
          >
            Refresh
          </Button>
          <Button
            disabled={!readyPreview || previewRequest.isPending || applyRequest.isPending}
            onClick={() => {
              if (!readyPreview) {
                return;
              }
              applyRequest.mutate({
                expectedFileHash: readyPreview.file.hash,
                providerKey: readyPreview.providerKey ?? undefined,
                target,
              }, {
                onError: (error) => displayError(error, 'Apply failed'),
                onSuccess: () => {
                  toast.add({
                    description: `${providerRuntimeLabels[runtime]} now uses the selected configuration.`,
                    title: 'Runtime saved',
                    type: 'success',
                  });
                  onOpenChange(false);
                },
              });
            }}
          >
            {applyRequest.isPending && <Spinner data-icon="inline-start" />}
            <span>Apply</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RuntimeCard({
  summary,
  onDetect,
}: {
  summary: RuntimeSummary;
  onDetect: () => void;
}) {
  const providers = useProviders(summary.runtime);
  const initialSelection = summary.managed && summary.providerId
    ? summary.providerId
    : officialDefaultValue;
  const [selection, setSelection] = useState(initialSelection);
  const [managedFieldsOpen, setManagedFieldsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const target = useMemo(() => selectedTarget(selection), [selection]);
  const detection = summary.detection;
  const isDetected = detection.status === 'detected';
  const selectedProvider = providers.data?.find((provider) => provider.id === selection);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RuntimeOption runtime={summary.runtime} />
        </CardTitle>
        <CardAction>
          <Badge variant={isDetected ? 'secondary' : 'destructive'}>
            {isDetected ? 'Detected' : 'Not detected'}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid min-w-0 gap-2 text-muted-foreground sm:grid-cols-2">
          <div className="min-w-0">
            <dt>Version</dt>
            <RuntimeMetadataValue value={detection.version ?? 'Unavailable'} />
          </div>
          <div className="min-w-0">
            <dt>Configuration</dt>
            <RuntimeMetadataValue value={detection.configurationPath} />
          </div>
        </dl>
        {detection.message && (
          <Alert variant="destructive">
            <AlertTitle>Runtime unavailable</AlertTitle>
            <AlertDescription>{detection.message}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-2">
          <label className="font-medium" htmlFor={`${summary.runtime}-provider`}>
            Provider
          </label>
          <Select
            id={`${summary.runtime}-provider`}
            value={selection}
            onValueChange={(value) => value && setSelection(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                <SelectedProviderValue
                  isPending={providers.isPending}
                  provider={selectedProvider}
                  runtime={summary.runtime}
                  selection={selection}
                />
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                <SelectItem value={officialDefaultValue}>
                  <OfficialDefaultOption runtime={summary.runtime} />
                </SelectItem>
                {providers.data?.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <ProviderSelectOption provider={provider} />
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setManagedFieldsOpen(true)}>
          Managed fields
        </Button>
        <Button size="sm" variant="outline" onClick={onDetect}>Detect Again</Button>
        <Button
          disabled={providers.isPending}
          size="sm"
          onClick={() => setPreviewOpen(true)}
        >
          Save
        </Button>
      </CardFooter>

      {managedFieldsOpen && (
        <ManagedFieldsDialog
          isOpen
          runtime={summary.runtime}
          onOpenChange={setManagedFieldsOpen}
        />
      )}
      {previewOpen && (
        <RuntimePreviewDialog
          isOpen
          runtime={summary.runtime}
          target={target}
          onOpenChange={setPreviewOpen}
        />
      )}
    </Card>
  );
}

export function RuntimesPage() {
  const runtimes = useRuntimes();

  if (runtimes.isPending) {
    return (
      <main className="grid w-full self-start gap-4 md:grid-cols-2" aria-label="Loading Runtimes" role="status">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </main>
    );
  }
  if (runtimes.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Runtimes could not be loaded</AlertTitle>
        <AlertDescription>Check the Foundry Server and try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <main
      className="grid w-full self-start items-start gap-4 pb-12 md:grid-cols-2"
      data-testid="runtime-grid"
    >
      {runtimes.data.map((summary) => (
        <RuntimeCard
          key={summary.runtime}
          summary={summary}
          onDetect={() => void runtimes.refetch()}
        />
      ))}
    </main>
  );
}
