import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Code } from '@astryxdesign/core/Code';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import type {
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

interface ConfigurationFieldGroup {
  path: string | null;
  fields: Array<{
    field: RuntimeConfigurationPreviewField;
    name: string;
  }>;
}

const styles = stylex.create({
  content: {
    minWidth: 0,
  },
  loading: {
    minHeight: `calc(${spacingVars['--spacing-12']} * 5)`,
  },
  list: {
    minWidth: 0,
  },
  nestedList: {
    minWidth: 0,
    paddingInlineStart: spacingVars['--spacing-3'],
  },
  value: {
    minWidth: 0,
    overflow: 'hidden',
  },
  arrow: {
    flexShrink: 0,
  },
  diffGrid: {
    gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
    minWidth: 0,
  },
});

function groupConfigurationFields(
  fields: RuntimeConfigurationPreviewField[],
): ConfigurationFieldGroup[] {
  const groups: ConfigurationFieldGroup[] = [];
  const groupsByPath = new Map<string | null, ConfigurationFieldGroup>();

  for (const field of fields) {
    const separatorIndex = field.key.lastIndexOf('.');
    const path = separatorIndex === -1 ? null : field.key.slice(0, separatorIndex);
    const name = separatorIndex === -1 ? field.key : field.key.slice(separatorIndex + 1);
    let group = groupsByPath.get(path);
    if (group === undefined) {
      group = { path, fields: [] };
      groupsByPath.set(path, group);
      groups.push(group);
    }
    group.fields.push({ field, name });
  }

  return groups;
}

function PreviewValue({ value }: { value: RuntimeConfigurationPreviewValue }) {
  let text: string;
  let isCode = false;
  let isSecondary = false;
  switch (value.kind) {
    case 'absent': {
      text = 'Not set';
      isSecondary = true;
      break;
    }
    case 'plain': {
      text = value.value;
      isCode = true;
      break;
    }
    case 'secret': {
      text = value.configured
        ? (value.suffix === null ? 'Configured' : `****${value.suffix}`)
        : 'Not configured';
      isCode = value.configured;
      isSecondary = !value.configured;
      break;
    }
  }

  return (
    <Text
      type={isCode ? 'code' : 'supporting'}
      color={isSecondary ? 'secondary' : 'primary'}
      maxLines={1}
      wordBreak="break-all"
      xstyle={styles.value}
    >
      {text}
    </Text>
  );
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
          {isVisible
            ? (
                <Text
                  type="code"
                  maxLines={1}
                  wordBreak="break-all"
                  xstyle={styles.value}
                >
                  {revealState.apiKey}
                </Text>
              )
            : <PreviewValue value={field.proposed} />}
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

function ConfigurationFieldGroups({
  fields,
  renderDescription,
}: {
  fields: RuntimeConfigurationPreviewField[];
  renderDescription: (field: RuntimeConfigurationPreviewField) => ReactNode;
}) {
  const groups = groupConfigurationFields(fields);
  return (
    <VStack gap={3} width="100%">
      {groups.map((group) => (
        <List
          key={group.path ?? 'top-level'}
          density="compact"
          hasDividers
          header={group.path === null
            ? undefined
            : <Text type="code" color="secondary">{group.path}</Text>}
          xstyle={group.path === null ? styles.list : styles.nestedList}
        >
          {group.fields.map(({ field, name }) => (
            <ListItem
              key={field.key}
              label={<Text type="code" color="secondary">{name}</Text>}
              description={renderDescription(field)}
            />
          ))}
        </List>
      ))}
    </VStack>
  );
}

function ChangedFieldList({
  fields,
  providerId,
  revealState,
  onReveal,
  onHide,
}: {
  fields: RuntimeConfigurationPreviewField[];
  providerId: string | undefined;
  revealState: RevealState;
  onReveal: (providerId: string) => void;
  onHide: () => void;
}) {
  return (
    <VStack gap={2} width="100%">
      <Heading level={5} accessibilityLevel={3}>Changes</Heading>
      <ConfigurationFieldGroups
        fields={fields}
        renderDescription={(field) => (
          <Grid
            width="100%"
            columnGap={2}
            align="center"
            xstyle={styles.diffGrid}
          >
            <StackItem>
              <PreviewValue value={field.current} />
            </StackItem>
            <Icon
              icon={ArrowRight}
              size="xsm"
              color="secondary"
              xstyle={styles.arrow}
            />
            <StackItem>
              <ProposedValue
                field={field}
                providerId={providerId}
                revealState={revealState}
                onReveal={onReveal}
                onHide={onHide}
              />
            </StackItem>
          </Grid>
        )}
      />
    </VStack>
  );
}

function UnchangedFieldList({
  fields,
}: {
  fields: RuntimeConfigurationPreviewField[];
}) {
  const triggerLabel = `${fields.length} unchanged ${
    fields.length === 1 ? 'setting' : 'settings'
  }`;
  return (
    <Collapsible
      trigger={(
        <Text type="supporting" color="secondary">
          {triggerLabel}
        </Text>
      )}
      defaultIsOpen={false}
    >
      <ConfigurationFieldGroups
        fields={fields}
        renderDescription={(field) => <PreviewValue value={field.current} />}
      />
    </Collapsible>
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
    const changedFields = readyPreview.fields.filter(
      (field) => field.operation !== 'no-change',
    );
    const unchangedFields = readyPreview.fields.filter(
      (field) => field.operation === 'no-change',
    );
    const changeSummary = changedFields.length === 0
      ? 'Configuration is already up to date in'
      : `${changedFields.length} ${changedFields.length === 1 ? 'setting' : 'settings'} will change in`;
    content = (
      <VStack gap={4} width="100%" xstyle={styles.content}>
        {applyMutation.isError && (
          <Banner
            status="error"
            title="Couldn't Apply Configuration"
            description={applyMutation.error.message}
          />
        )}
        <Text type="body" textWrap="pretty">
          {changeSummary}
          {' '}
          <Code>{readyPreview.file.path}</Code>
        </Text>
        {readyPreview.target.kind === 'provider' && (
          <VStack gap={1} width="100%">
            <HStack gap={2} wrap="wrap" vAlign="center">
              <Text type="label">{readyPreview.target.name}</Text>
              <ProviderConnectionStatus
                provider={{ connection: readyPreview.target.connection }}
              />
            </HStack>
            <Text
              type="supporting"
              color="secondary"
              maxLines={1}
              wordBreak="break-all"
              xstyle={styles.value}
            >
              {readyPreview.target.baseUrl}
            </Text>
          </VStack>
        )}
        {changedFields.length > 0 && (
          <ChangedFieldList
            fields={changedFields}
            providerId={providerId}
            revealState={revealState}
            onReveal={(id) => void reveal(id)}
            onHide={clearReveal}
          />
        )}
        {unchangedFields.length > 0 && <UnchangedFieldList fields={unchangedFields} />}
      </VStack>
    );
  }

  const runtimeLabel = providerRuntimeLabels[input.runtime];
  const dialogTitle = preview?.target.kind === 'provider'
    ? `Apply ${preview.target.name} to ${runtimeLabel}?`
    : (input.target.kind === 'official-default'
        ? `Restore ${runtimeLabel} Defaults?`
        : `Apply Provider to ${runtimeLabel}?`);
  const changedFieldCount = preview?.fields.filter(
    (field) => field.operation !== 'no-change',
  ).length;

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
        }
      }}
      purpose={applyMutation.isPending ? 'required' : 'info'}
      width={800}
      maxHeight="85vh"
    >
      <Layout
        header={(
          <DialogHeader
            title={dialogTitle}
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
                        ? `Apply to ${runtimeLabel}`
                        : 'Restore Defaults')}
                  variant="primary"
                  isLoading={applyMutation.isPending}
                  isDisabled={changedFieldCount === 0}
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
