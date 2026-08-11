import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Code } from '@astryxdesign/core/Code';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Table, proportional } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import type {
  RuntimeConfigurationChangeOperation,
  RuntimeConfigurationPreviewField,
  RuntimeConfigurationPreviewInput,
  RuntimeConfigurationPreviewValue,
  RuntimeSummary,
} from '../../../../shared/runtime-contract';
import { ProviderConnectionStatus } from '../providers/provider-connection-status';
import { resolveProviderRequest } from '../providers/provider-query';
import { providerRuntimeLabels } from '../providers/provider-runtime';
import type { RuntimeRequestError } from './runtime-query';
import {
  applyRuntimeConfiguration,
  getRuntimePreviewQueryOptions,
} from './runtime-query';

type RevealState
  = | { status: 'hidden' }
    | { status: 'loading'; providerId: string }
    | { status: 'visible'; providerId: string; apiKey: string }
    | { status: 'error'; providerId: string; message: string };

interface PreviewTableRow extends Record<string, unknown> {
  key: string;
  current: RuntimeConfigurationPreviewValue;
  proposed: RuntimeConfigurationPreviewValue;
  operation: RuntimeConfigurationChangeOperation;
}

const operationPresentation = {
  'add': { label: 'Add', color: 'green' as const },
  'update': { label: 'Update', color: 'blue' as const },
  'remove': { label: 'Remove', color: 'red' as const },
  'no-change': { label: 'No change', color: 'gray' as const },
};

const styles = stylex.create({
  content: {
    minWidth: 0,
  },
  loading: {
    minHeight: `calc(${spacingVars['--spacing-12']} * 5)`,
  },
  table: {
    minWidth: 0,
  },
  value: {
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
});

function MaskedSecret({ suffix }: { suffix: string | null }) {
  return <Code>{suffix === null ? 'Configured' : `****${suffix}`}</Code>;
}

function PreviewValue({ value }: { value: RuntimeConfigurationPreviewValue }) {
  switch (value.kind) {
    case 'absent': {
      return <Text type="supporting" color="secondary">Not set</Text>;
    }
    case 'plain': {
      return (
        <Text type="supporting" xstyle={styles.value}>
          <Code>{value.value}</Code>
        </Text>
      );
    }
    case 'secret': {
      return value.configured
        ? <MaskedSecret suffix={value.suffix} />
        : <Text type="supporting" color="secondary">Not configured</Text>;
    }
  }
}

function ProposedValue({
  field,
  providerId,
  revealState,
  onReveal,
  onHide,
}: {
  field: RuntimeConfigurationPreviewField;
  providerId: string | undefined;
  revealState: RevealState;
  onReveal: (providerId: string) => void;
  onHide: () => void;
}) {
  if (field.proposed.kind !== 'secret' || !field.proposed.configured || providerId === undefined) {
    return <PreviewValue value={field.proposed} />;
  }

  const isCurrentProvider = revealState.status !== 'hidden'
    && revealState.providerId === providerId;
  const isVisible = isCurrentProvider && revealState.status === 'visible';
  const isLoading = isCurrentProvider && revealState.status === 'loading';
  return (
    <VStack gap={1} width="100%" xstyle={styles.value}>
      <HStack gap={1} vAlign="center" width="100%">
        <StackItem size="fill">
          <Text type="supporting" xstyle={styles.value}>
            {isVisible
              ? <Code>{revealState.apiKey}</Code>
              : <MaskedSecret suffix={field.proposed.suffix} />}
          </Text>
        </StackItem>
        <IconButton
          label={isVisible ? 'Hide Provider API Key' : 'Reveal Provider API Key'}
          tooltip={isVisible
            ? 'Hide API key'
            : (revealState.status === 'error'
                ? 'Retry reveal API key'
                : 'Reveal API key')}
          icon={<Icon icon={isVisible ? EyeOff : Eye} size="sm" color="inherit" />}
          variant="ghost"
          size="sm"
          isLoading={isLoading}
          onClick={() => {
            if (isVisible) {
              onHide();
            } else {
              onReveal(providerId);
            }
          }}
        />
      </HStack>
      {isCurrentProvider && revealState.status === 'error' && (
        <HStack gap={1} vAlign="center">
          <StatusDot variant="error" label="Reveal failed" />
          <Text type="supporting" color="secondary" textWrap="pretty">
            {revealState.message}
          </Text>
        </HStack>
      )}
    </VStack>
  );
}

function PreviewLoading() {
  return (
    <HStack
      hAlign="center"
      vAlign="center"
      width="100%"
      xstyle={styles.loading}
    >
      <Spinner label="Reading Runtime configuration" />
    </HStack>
  );
}

export function RuntimePreviewDialog({
  input,
  onClose,
  onApplied,
}: {
  input: RuntimeConfigurationPreviewInput;
  onClose: () => void;
  onApplied: (summary: RuntimeSummary) => void;
}) {
  const requestVersionRef = useRef(0);
  const [revealState, setRevealState] = useState<RevealState>({ status: 'hidden' });
  const previewQuery = useQuery(getRuntimePreviewQueryOptions(input));
  const preview = previewQuery.data;
  const providerId = preview?.target.kind === 'provider'
    ? preview.target.providerId
    : undefined;

  const clearReveal = () => {
    requestVersionRef.current += 1;
    setRevealState({ status: 'hidden' });
  };
  const applyMutation = useMutation<RuntimeSummary, RuntimeRequestError>({
    mutationFn: () => applyRuntimeConfiguration(input),
    onSuccess: (summary) => {
      clearReveal();
      onApplied(summary);
    },
  });
  const close = () => {
    if (applyMutation.isPending) {
      return;
    }
    clearReveal();
    onClose();
  };
  const apply = () => {
    if (applyMutation.isPending) {
      return;
    }
    clearReveal();
    applyMutation.mutate();
  };
  const reveal = async (nextProviderId: string) => {
    const version = requestVersionRef.current + 1;
    requestVersionRef.current = version;
    setRevealState({ status: 'loading', providerId: nextProviderId });
    try {
      const apiKey = await resolveProviderRequest<string | null>(
        () => globalThis.api.providers.revealProviderApiKey(nextProviderId),
        'Provider API key could not be revealed.',
      );
      if (requestVersionRef.current !== version) {
        return;
      }
      if (apiKey === null) {
        setRevealState({
          status: 'error',
          providerId: nextProviderId,
          message: 'Provider API key is no longer configured.',
        });
        return;
      }
      setRevealState({ status: 'visible', providerId: nextProviderId, apiKey });
    } catch (error) {
      if (requestVersionRef.current !== version) {
        return;
      }
      setRevealState({
        status: 'error',
        providerId: nextProviderId,
        message: error instanceof Error
          ? error.message
          : 'Provider API key could not be revealed.',
      });
    }
  };

  const columns: Array<TableColumn<PreviewTableRow>> = [
    {
      key: 'key',
      header: 'Managed field',
      width: proportional(2),
      renderCell: ({ key }) => (
        <Text type="supporting" xstyle={styles.value}>
          <Code>{key}</Code>
        </Text>
      ),
    },
    {
      key: 'current',
      header: 'Current value',
      width: proportional(1.5),
      renderCell: ({ current }) => <PreviewValue value={current} />,
    },
    {
      key: 'proposed',
      header: 'Proposed value',
      width: proportional(1.5),
      renderCell: (field) => (
        <ProposedValue
          field={field}
          providerId={providerId}
          revealState={revealState}
          onReveal={(id) => void reveal(id)}
          onHide={clearReveal}
        />
      ),
    },
    {
      key: 'operation',
      header: 'Change',
      width: proportional(1),
      renderCell: ({ operation }) => {
        const presentation = operationPresentation[operation];
        return (
          <Token
            label={presentation.label}
            color={presentation.color}
            size="sm"
          />
        );
      },
    },
  ];

  let content;
  if (previewQuery.isPending) {
    content = <PreviewLoading />;
  } else if (previewQuery.isError) {
    content = (
      <Banner
        status="error"
        container="section"
        title="Couldn't Preview Configuration"
        description={previewQuery.error.message}
        endContent={(
          <Button
            label="Retry"
            variant="ghost"
            icon={<Icon icon={RefreshCw} size="sm" color="inherit" />}
            onClick={() => void previewQuery.refetch()}
          />
        )}
      />
    );
  } else {
    const readyPreview = previewQuery.data;
    const targetName = readyPreview.target.kind === 'provider'
      ? readyPreview.target.name
      : 'Official Default';
    content = (
      <VStack gap={4} width="100%" xstyle={styles.content}>
        {applyMutation.isError && (
          <Banner
            status="error"
            title="Couldn't Apply Configuration"
            description={applyMutation.error.message}
          />
        )}
        <VStack gap={2} width="100%">
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Text type="supporting" color="secondary">Target</Text>
            <Text type="label">{targetName}</Text>
            {readyPreview.target.kind === 'provider' && (
              <ProviderConnectionStatus
                provider={{ connection: readyPreview.target.connection }}
              />
            )}
          </HStack>
          {readyPreview.target.kind === 'provider' && (
            <Text type="supporting" color="secondary" xstyle={styles.value}>
              {readyPreview.target.baseUrl}
            </Text>
          )}
          <HStack gap={2} wrap="wrap" vAlign="center">
            <Text type="supporting" color="secondary">Configuration</Text>
            <Code>{readyPreview.file.path}</Code>
            <Text type="supporting" color="secondary">
              {readyPreview.file.exists ? 'Existing file' : 'File not found'}
            </Text>
          </HStack>
        </VStack>
        <Table
          data={readyPreview.fields.map((field): PreviewTableRow => ({ ...field }))}
          columns={columns}
          idKey="key"
          rowCount={readyPreview.fields.length}
          density="compact"
          dividers="rows"
          verticalAlign="top"
          textOverflow="wrap"
          aria-label={`${providerRuntimeLabels[input.runtime]} configuration changes`}
          xstyle={styles.table}
        />
      </VStack>
    );
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
        }
      }}
      purpose={applyMutation.isPending ? 'required' : 'info'}
      width={820}
      maxHeight="85vh"
    >
      <Layout
        header={(
          <DialogHeader
            title={`Review ${providerRuntimeLabels[input.runtime]} Changes`}
            onOpenChange={applyMutation.isPending
              ? undefined
              : (isOpen) => {
                  if (!isOpen) {
                    close();
                  }
                }}
          />
        )}
        content={<LayoutContent isScrollable>{content}</LayoutContent>}
        footer={(
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end">
              <Button
                label="Cancel"
                variant="ghost"
                isDisabled={applyMutation.isPending}
                onClick={close}
              />
              {preview !== undefined && (
                <Button
                  label={applyMutation.isError
                    ? 'Retry Apply'
                    : (input.target.kind === 'provider'
                        ? 'Apply Provider'
                        : 'Restore Official Default')}
                  variant="primary"
                  isLoading={applyMutation.isPending}
                  onClick={apply}
                />
              )}
            </HStack>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}
