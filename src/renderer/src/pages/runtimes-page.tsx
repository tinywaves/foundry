import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { Selector, SelectorOption } from '@astryxdesign/core/Selector';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import {
  sizeVars,
  spacingVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { providerRuntimes } from '../../../shared/provider-contract';
import type {
  ProviderRuntime,
  ProviderSummary,
} from '../../../shared/provider-contract';
import type { RuntimeSummary, RuntimeConfigurationPreviewInput } from '../../../shared/runtime-contract';
import { routePaths } from '@renderer/routes';
import { ProviderConnectionStatus } from './providers/provider-connection-status';
import { providerRuntimeLabels } from './providers/provider-runtime';
import { ProviderRuntimeIcon } from './providers/provider-runtime-icon';
import { useProviderAvatarUrl } from './providers/use-provider-avatar-url';
import { useProviderList } from './providers/use-provider-list';
import { resetProviderList } from './providers/provider-query';
import {
  getEffectiveRuntimeTarget,
  getRuntimeConfigurationTarget,
  getRuntimeProviders,
  getRuntimeTargetOptions,
  hasRuntimeTargetChange,
  isAvailableRuntimeTarget,
  OFFICIAL_DEFAULT_TARGET,
  withoutRuntimeDraftTarget,
  withRuntimeDraftTarget,
} from './runtimes/runtime-target';
import type { RuntimeDraftTargets } from './runtimes/runtime-target';
import {
  resetRuntimeList,
  resetRuntimeProviderState,
} from './runtimes/runtime-query';
import { useRuntimeList } from './runtimes/use-runtime-list';
import { RuntimePreviewDialog } from './runtimes/runtime-preview-dialog';

type ProviderListState = ReturnType<typeof useProviderList>['state'];

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const styles = stylex.create({
  page: {
    minWidth: 0,
  },
  list: {
    minWidth: 0,
  },
  runtimeRow: {
    minWidth: 0,
    paddingBlock: spacingVars['--spacing-4'],
  },
  rowDescription: {
    minWidth: 0,
    paddingBlockStart: spacingVars['--spacing-2'],
  },
  currentState: {
    minWidth: 0,
  },
  selector: {
    minWidth: 0,
    maxWidth: `calc(${spacingVars['--spacing-12']} * 10)`,
  },
});

function formatAppliedAt(timestamp: number): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? 'Applied at an unknown time'
    : `Applied ${dateTimeFormatter.format(date)}`;
}

function getCurrentProvider(
  runtime: RuntimeSummary,
  providerState: ProviderListState,
): ProviderSummary | undefined {
  if (runtime.status !== 'provider' || providerState.status !== 'success') {
    return undefined;
  }
  return providerState.providers.find((provider) => provider.id === runtime.providerId);
}

function RuntimeCurrentState({
  runtime,
  providerState,
}: {
  runtime: RuntimeSummary;
  providerState: ProviderListState;
}) {
  const provider = getCurrentProvider(runtime, providerState);
  let label: string;
  let statusVariant: 'neutral' | 'success' | 'accent';

  switch (runtime.status) {
    case 'not-managed': {
      label = 'Not managed by Foundry';
      statusVariant = 'neutral';
      break;
    }
    case 'provider': {
      label = provider?.name ?? runtime.providerId;
      statusVariant = 'success';
      break;
    }
    case 'official-default': {
      label = 'Official Default';
      statusVariant = 'accent';
      break;
    }
  }

  return (
    <VStack gap={1} width="100%" xstyle={styles.currentState}>
      <Text type="supporting" weight="medium" color="secondary">
        Current configuration
      </Text>
      <HStack gap={2} vAlign="center" width="100%">
        <StatusDot variant={statusVariant} label={label} />
        <Text type="label" maxLines={1}>{label}</Text>
      </HStack>
      {runtime.status === 'provider' && (
        <Text type="supporting" color="secondary" maxLines={1}>
          {provider?.baseUrl ?? `Provider ID: ${runtime.providerId}`}
        </Text>
      )}
      {runtime.appliedAt !== null && (
        <Text type="supporting" color="secondary">
          {formatAppliedAt(runtime.appliedAt)}
        </Text>
      )}
    </VStack>
  );
}

function ProviderTargetOption({ provider }: { provider: ProviderSummary }) {
  const avatarUrl = useProviderAvatarUrl(provider);

  return (
    <SelectorOption
      icon={<Avatar src={avatarUrl} alt="" size="sm" tooltip={false} />}
      label={provider.name}
      description={provider.baseUrl}
      endContent={<ProviderConnectionStatus provider={provider} />}
    />
  );
}

function OfficialDefaultOption({ runtime }: { runtime: ProviderRuntime }) {
  return (
    <SelectorOption
      icon={<ProviderRuntimeIcon runtime={runtime} />}
      label="Official Default"
      description={`Official ${providerRuntimeLabels[runtime]} configuration`}
    />
  );
}

function LoadingTargetSelector({ index }: { index: number }) {
  return (
    <VStack gap={1} width="100%" xstyle={styles.selector}>
      <Skeleton
        width="30%"
        height={spacingVars['--spacing-3']}
        radius={1}
        index={index}
      />
      <Skeleton
        width="100%"
        height={sizeVars['--size-element-md']}
        radius={2}
        index={index + 1}
      />
    </VStack>
  );
}

function RuntimeTargetSelector({
  runtime,
  providerState,
  value,
  onChange,
  onRetry,
}: {
  runtime: ProviderRuntime;
  providerState: ProviderListState;
  value: string | undefined;
  onChange: (value: string) => void;
  onRetry: () => void;
}) {
  if (providerState.status === 'loading') {
    return <LoadingTargetSelector index={providerRuntimes.indexOf(runtime) * 4 + 2} />;
  }

  const providers = providerState.status === 'success'
    ? getRuntimeProviders(runtime, providerState.providers)
    : [];
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const options = getRuntimeTargetOptions(runtime, providers);
  const hasError = providerState.status === 'error';

  return (
    <VStack gap={2} width="100%" xstyle={styles.selector}>
      <Selector
        label="Target Provider"
        options={options}
        value={value}
        placeholder="Choose a Provider"
        searchPlaceholder={`Search ${providerRuntimeLabels[runtime]} Providers`}
        hasSearch
        isDisabled={hasError}
        disabledMessage={hasError ? 'Providers could not be loaded for this Runtime.' : undefined}
        status={hasError ? { type: 'error', message: providerState.message } : undefined}
        statusVariant="detached"
        width="100%"
        onChange={(nextValue) => {
          if (isAvailableRuntimeTarget(nextValue, providersById)) {
            onChange(nextValue);
          }
        }}
        renderOption={(option) => {
          if (option.value === OFFICIAL_DEFAULT_TARGET) {
            return <OfficialDefaultOption runtime={runtime} />;
          }
          const provider = providersById.get(option.value);
          return provider
            ? <ProviderTargetOption provider={provider} />
            : <SelectorOption label={option.label ?? option.value} />;
        }}
      />
      {hasError && (
        <HStack hAlign="end">
          <Button
            label={`Retry ${providerRuntimeLabels[runtime]} Providers`}
            variant="ghost"
            icon={<Icon icon={RefreshCw} size="sm" color="inherit" />}
            onClick={onRetry}
          />
        </HStack>
      )}
    </VStack>
  );
}

function RuntimeRow({
  runtime,
  providerState,
  target,
  onTargetChange,
  onReview,
  onRetryProviders,
}: {
  runtime: RuntimeSummary;
  providerState: ProviderListState;
  target: string | undefined;
  onTargetChange: (value: string) => void;
  onReview: (input: RuntimeConfigurationPreviewInput) => void;
  onRetryProviders: () => void;
}) {
  const providers = providerState.status === 'success'
    ? getRuntimeProviders(runtime.runtime, providerState.providers)
    : [];
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const hasChangedTarget = hasRuntimeTargetChange(runtime, target);
  const canReview = providerState.status === 'success'
    && hasChangedTarget
    && isAvailableRuntimeTarget(target, providersById);
  let reviewTooltip: string | undefined;
  if (!canReview) {
    if (providerState.status !== 'success') {
      reviewTooltip = 'Providers must be available before changes can be reviewed.';
    } else if (target === undefined) {
      reviewTooltip = 'Choose a target Provider first.';
    } else if (hasChangedTarget) {
      reviewTooltip = 'The selected Provider is no longer available.';
    } else {
      reviewTooltip = 'Choose a target different from the current configuration.';
    }
  }

  return (
    <ListItem
      xstyle={styles.runtimeRow}
      startContent={<ProviderRuntimeIcon runtime={runtime.runtime} size="md" />}
      label={providerRuntimeLabels[runtime.runtime]}
      description={(
        <VStack gap={4} width="100%" xstyle={styles.rowDescription}>
          <RuntimeCurrentState runtime={runtime} providerState={providerState} />
          <RuntimeTargetSelector
            runtime={runtime.runtime}
            providerState={providerState}
            value={target}
            onChange={onTargetChange}
            onRetry={onRetryProviders}
          />
          <HStack hAlign="end" width="100%">
            <Button
              label="Review Changes"
              variant="secondary"
              isDisabled={!canReview}
              tooltip={reviewTooltip}
              onClick={() => {
                if (canReview) {
                  onReview({
                    runtime: runtime.runtime,
                    target: getRuntimeConfigurationTarget(target),
                  });
                }
              }}
            />
          </HStack>
        </VStack>
      )}
    />
  );
}

function LoadingRuntimeList() {
  return (
    <List
      density="spacious"
      hasDividers
      header={<Heading level={4} accessibilityLevel={2}>Runtime configuration</Heading>}
      xstyle={styles.list}
    >
      {providerRuntimes.map((runtime, index) => (
        <ListItem
          key={runtime}
          xstyle={styles.runtimeRow}
          startContent={<ProviderRuntimeIcon runtime={runtime} size="md" />}
          label={providerRuntimeLabels[runtime]}
          description={(
            <VStack gap={4} width="100%" xstyle={styles.rowDescription}>
              <VStack gap={1} width="100%">
                <Text type="supporting" weight="medium" color="secondary">
                  Current configuration
                </Text>
                <Skeleton
                  width="45%"
                  height={spacingVars['--spacing-4']}
                  radius={1}
                  index={index * 4}
                />
              </VStack>
              <LoadingTargetSelector index={index * 4 + 2} />
              <HStack hAlign="end" width="100%">
                <Skeleton
                  width="25%"
                  height={sizeVars['--size-element-md']}
                  radius={2}
                  index={index * 4 + 3}
                />
              </HStack>
            </VStack>
          )}
        />
      ))}
    </List>
  );
}

export function RuntimesPage() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const { state: runtimeState } = useRuntimeList();
  const { state: codexProviderState } = useProviderList('codex');
  const { state: claudeProviderState } = useProviderList('claude-code');
  const [draftTargets, setDraftTargets] = useState<RuntimeDraftTargets>({});
  const [previewInput, setPreviewInput] = useState<RuntimeConfigurationPreviewInput>();
  const providerStates = {
    'codex': codexProviderState,
    'claude-code': claudeProviderState,
  } satisfies Record<ProviderRuntime, ProviderListState>;

  let content;
  if (runtimeState.status === 'loading') {
    content = <LoadingRuntimeList />;
  } else if (runtimeState.status === 'error') {
    content = (
      <Banner
        status="error"
        container="section"
        title="Couldn't Load Runtimes"
        description={runtimeState.message}
        endContent={(
          <Button
            label="Retry"
            variant="ghost"
            icon={<Icon icon={RefreshCw} size="sm" color="inherit" />}
            onClick={() => void resetRuntimeList(queryClient)}
          />
        )}
      />
    );
  } else {
    content = (
      <List
        density="spacious"
        hasDividers
        header={<Heading level={4} accessibilityLevel={2}>Runtime configuration</Heading>}
        xstyle={styles.list}
      >
        {runtimeState.runtimes.map((runtime) => (
          <RuntimeRow
            key={runtime.runtime}
            runtime={runtime}
            providerState={providerStates[runtime.runtime]}
            target={getEffectiveRuntimeTarget(runtime, draftTargets)}
            onTargetChange={(target) => {
              setDraftTargets((current) => (
                withRuntimeDraftTarget(current, runtime.runtime, target)
              ));
            }}
            onReview={setPreviewInput}
            onRetryProviders={() => {
              void resetProviderList(queryClient, runtime.runtime);
            }}
          />
        ))}
      </List>
    );
  }

  return (
    <VStack width="100%" minHeight="100%" xstyle={styles.page}>
      <Section padding={4} paddingBlock={2}>
        <HStack gap={3} hAlign="between" vAlign="center">
          <Heading level={3} accessibilityLevel={1}>Runtimes</Heading>
          <Link
            as={RouterLink}
            href={routePaths.agentRuntimeProviders}
            isStandalone
          >
            Manage Providers
          </Link>
        </HStack>
      </Section>
      <Section padding={4} paddingBlock={2}>
        {content}
      </Section>
      {previewInput && (
        <RuntimePreviewDialog
          key={`${previewInput.runtime}:${previewInput.target.kind}:${
            previewInput.target.kind === 'provider' ? previewInput.target.providerId : 'default'
          }`}
          input={previewInput}
          onClose={() => setPreviewInput(undefined)}
          onApplied={(summary) => {
            setPreviewInput(undefined);
            setDraftTargets((current) => (
              withoutRuntimeDraftTarget(current, summary.runtime)
            ));
            void resetRuntimeProviderState(queryClient, summary.runtime);
            const runtimeLabel = providerRuntimeLabels[summary.runtime];
            showToast({
              body: summary.status === 'official-default'
                ? `Official defaults restored for ${runtimeLabel}. Reopen ${runtimeLabel} to load the configuration.`
                : `Provider applied to ${runtimeLabel}. Reopen ${runtimeLabel} to load the configuration.`,
              uniqueID: `runtime-apply-${summary.runtime}`,
            });
          }}
        />
      )}
    </VStack>
  );
}
