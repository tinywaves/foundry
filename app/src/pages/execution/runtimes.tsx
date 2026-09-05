import type {
  ProviderRuntime,
  RuntimeConfigurationPreviewField,
  RuntimeConfigurationPreviewValue,
  RuntimeConfigurationTarget,
  RuntimeSummary,
} from '@dhzh/foundry-api-contract';
import { EyeIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert';
import { Button } from '#/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
import { useProviders } from '#/hooks/use-providers';
import {
  RuntimeRequestError,
  useApplyRuntimeConfiguration,
  usePreviewRuntimeConfiguration,
  useRuntimes,
} from '#/hooks/use-runtimes';

const officialDefaultValue = 'official-default';
const runtimeLabels: Record<ProviderRuntime, string> = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
};
const managedFieldReferences: Record<ProviderRuntime, string[]> = {
  'claude-code': [
    'env.ANTHROPIC_BASE_URL',
    'env.ANTHROPIC_AUTH_TOKEN',
    'env.ANTHROPIC_API_KEY',
    'env.ANTHROPIC_DEFAULT_MODEL',
    'env.ANTHROPIC_DEFAULT_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_MODEL_SUPPORTED_CAPABILITIES',
    'env.ANTHROPIC_DEFAULT_OPUS_MODEL',
    'env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
    'env.ANTHROPIC_DEFAULT_SONNET_MODEL',
    'env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES',
    'env.ANTHROPIC_DEFAULT_HAIKU_MODEL',
    'env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES',
    'env.ANTHROPIC_DEFAULT_FABLE_MODEL',
    'env.ANTHROPIC_DEFAULT_FABLE_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES',
    'env.CLAUDE_CODE_SUBAGENT_MODEL',
  ],
  'codex': [
    'model',
    'review_model',
    'model_provider',
    '[model_providers.<key>].name',
    '[model_providers.<key>].base_url',
    '[model_providers.<key>].wire_api',
    '[model_providers.<key>].experimental_bearer_token',
  ],
};

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

function ManagedFieldReference({ runtime }: { runtime: ProviderRuntime }) {
  const fields = managedFieldReferences[runtime];

  return (
    <Collapsible>
      <div className="rounded-md border bg-muted/20">
        <CollapsibleTrigger
          render={<Button className="h-auto w-full justify-between px-3 py-2" variant="ghost" />}
        >
          <span className="text-start">
            <span className="block font-medium">Foundry managed fields</span>
            <span className="block font-normal text-muted-foreground">
              Static display reference only
            </span>
          </span>
          <span className="text-muted-foreground">{fields.length}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t px-3 py-3">
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {fields.map((field) => (
              <code
                className="break-all rounded bg-muted px-2 py-1 text-[0.6875rem]"
                key={field}
              >
                {field}
              </code>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function RuntimePreviewDialog({
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
                    description: `${runtimeLabels[runtime]} now uses the selected configuration.`,
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const target = useMemo(() => selectedTarget(selection), [selection]);
  const detection = summary.detection;
  const canApply = detection.status === 'detected';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{runtimeLabels[summary.runtime]}</CardTitle>
        <CardDescription>
          {summary.managed
            ? (summary.providerId === null
                ? 'Managed by Foundry · Official Default'
                : 'Managed by Foundry')
            : 'Not managed by Foundry'}
        </CardDescription>
        <CardAction>
          <span className={canApply ? 'text-emerald-600' : 'text-destructive'}>
            {canApply ? 'Detected' : 'Not detected'}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-2 text-muted-foreground sm:grid-cols-2">
          <div>
            <dt>Version</dt>
            <dd className="font-mono text-foreground">{detection.version ?? 'Unavailable'}</dd>
          </div>
          <div>
            <dt>Configuration</dt>
            <dd className="break-all font-mono text-foreground">{detection.configurationPath}</dd>
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
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                <SelectItem value={officialDefaultValue}>Official Default</SelectItem>
                {providers.data?.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <ManagedFieldReference runtime={summary.runtime} />
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={onDetect}>Detect Again</Button>
        <Button disabled={!canApply || providers.isPending} onClick={() => setPreviewOpen(true)}>
          Save
        </Button>
      </CardFooter>

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
      <main className="grid gap-4 md:grid-cols-2" aria-label="Loading Runtimes" role="status">
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
    <main className="grid gap-4 pb-12 md:grid-cols-2">
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
