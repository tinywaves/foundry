import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Grid } from '@astryxdesign/core/Grid';
import { HoverCard } from '@astryxdesign/core/HoverCard';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Section } from '@astryxdesign/core/Section';
import { Selector, SelectorOption } from '@astryxdesign/core/Selector';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import {
  sizeVars,
  spacingVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { providerRuntimes } from '../../../shared/provider-contract';
import type {
  ProviderRuntime,
  ProviderSummary,
} from '../../../shared/provider-contract';
import type { RuntimeSummary, RuntimeConfigurationPreviewInput } from '../../../shared/runtime-contract';
import { PageHeader } from '@renderer/components/page-header';
import { routePaths } from '@renderer/routes';
import { ProviderConnectionStatus } from './providers/provider-connection-status';
import { providerRuntimeLabels } from './providers/provider-runtime';
import { ProviderRuntimeIcon } from './providers/provider-runtime-icon';
import { useProviderAvatarUrl } from './providers/use-provider-avatar-url';
import { useProviderList } from './providers/use-provider-list';
import { resetProviderList } from './providers/provider-query';
import {
  getEffectiveRuntimeTarget,
  getPersistedRuntimeTarget,
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
import { RuntimeApplyResultDialog } from './runtimes/runtime-apply-result-dialog';
import type { RuntimeApplyResult } from './runtimes/runtime-apply-result';

type ProviderListState = ReturnType<typeof useProviderList>['state'];

const runtimeGridColumns = {
  minWidth: 480,
  max: 2,
  repeat: 'fit',
} as const;

const styles = stylex.create({
  page: {
    minWidth: 0,
  },
  runtimeGrid: {
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
  selector: {
    minWidth: 0,
    maxWidth: `calc(${spacingVars['--spacing-12']} * 10)`,
  },
  changeLabel: {
    flexShrink: 0,
  },
  selectorControl: {
    flexGrow: 1,
    minWidth: 0,
  },
});

function RuntimeTitle({ runtime }: { runtime: ProviderRuntime }) {
  return (
    <HStack as="span" gap={2} vAlign="center">
      <ProviderRuntimeIcon runtime={runtime} size="md" />
      <Text type="large">{providerRuntimeLabels[runtime]}</Text>
    </HStack>
  );
}

function ProviderOptionName({ provider }: { provider: ProviderSummary }) {
  return (
    <HoverCard
      placement="end"
      alignment="start"
      focusTrigger="never"
      label={`${provider.name} provider details`}
      content={(
        <VStack gap={2} maxWidth="min(44ch, 80vw)">
          <VStack gap={0.5}>
            <Text type="supporting" weight="medium" color="secondary">
              Base URL
            </Text>
            <Text type="body" textWrap="pretty">
              {provider.baseUrl}
            </Text>
          </VStack>
          <VStack gap={0.5}>
            <Text type="supporting" weight="medium" color="secondary">
              Connection
            </Text>
            <ProviderConnectionStatus provider={provider} />
          </VStack>
        </VStack>
      )}
    >
      <Text
        type="inherit"
        color="inherit"
        maxLines={1}
        aria-label={`${provider.name} provider details`}
      >
        {provider.name}
      </Text>
    </HoverCard>
  );
}

function ProviderTargetOption({
  provider,
  isInUse,
}: {
  provider: ProviderSummary;
  isInUse: boolean;
}) {
  const avatarUrl = useProviderAvatarUrl(provider);

  return (
    <SelectorOption
      icon={<Avatar src={avatarUrl} alt="" size="xsm" tooltip={false} />}
      label={<ProviderOptionName provider={provider} />}
      endContent={isInUse ? <Token label="In use" color="green" size="sm" /> : undefined}
    />
  );
}

function OfficialDefaultOption({
  runtime,
  isInUse,
}: {
  runtime: ProviderRuntime;
  isInUse: boolean;
}) {
  return (
    <SelectorOption
      icon={<ProviderRuntimeIcon runtime={runtime} />}
      label="Official Default"
      endContent={isInUse ? <Token label="In use" color="green" size="sm" /> : undefined}
    />
  );
}

function LoadingTargetSelector({ index }: { index: number }) {
  return (
    <HStack gap={2} vAlign="center" width="100%" xstyle={styles.selector}>
      <Text type="label" xstyle={styles.changeLabel}>Use:</Text>
      <VStack width="100%" xstyle={styles.selectorControl}>
        <Skeleton
          width="100%"
          height={sizeVars['--size-element-md']}
          radius={2}
          index={index}
        />
      </VStack>
    </HStack>
  );
}

function RuntimeTargetSelector({
  runtime,
  providerState,
  value,
  inUseTarget,
  onChange,
  onRetry,
}: {
  runtime: ProviderRuntime;
  providerState: ProviderListState;
  value: string | undefined;
  inUseTarget: string | undefined;
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
      <HStack gap={2} vAlign="center" width="100%">
        <Text type="label" xstyle={styles.changeLabel}>Use:</Text>
        <Selector
          label="Use"
          isLabelHidden
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
          xstyle={styles.selectorControl}
          onChange={(nextValue) => {
            if (isAvailableRuntimeTarget(nextValue, providersById)) {
              onChange(nextValue);
            }
          }}
          renderOption={(option) => {
            if (option.value === OFFICIAL_DEFAULT_TARGET) {
              return (
                <OfficialDefaultOption
                  runtime={runtime}
                  isInUse={inUseTarget === OFFICIAL_DEFAULT_TARGET}
                />
              );
            }
            const provider = providersById.get(option.value);
            return provider
              ? (
                  <ProviderTargetOption
                    provider={provider}
                    isInUse={inUseTarget === provider.id}
                  />
                )
              : <SelectorOption label={option.label ?? option.value} />;
          }}
        />
      </HStack>
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
  onApplyRequest,
  onRetryProviders,
}: {
  runtime: RuntimeSummary;
  providerState: ProviderListState;
  target: string | undefined;
  onTargetChange: (value: string) => void;
  onApplyRequest: (input: RuntimeConfigurationPreviewInput) => void;
  onRetryProviders: () => void;
}) {
  const providers = providerState.status === 'success'
    ? getRuntimeProviders(runtime.runtime, providerState.providers)
    : [];
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const hasChangedTarget = hasRuntimeTargetChange(runtime, target);
  const canApply = providerState.status === 'success'
    && hasChangedTarget
    && isAvailableRuntimeTarget(target, providersById);
  let applyTooltip: string | undefined;
  if (!canApply) {
    if (providerState.status !== 'success') {
      applyTooltip = 'Providers must be available before a configuration can be applied.';
    } else if (target === undefined) {
      applyTooltip = 'Choose a Provider to apply.';
    } else if (hasChangedTarget) {
      applyTooltip = 'The selected Provider is no longer available.';
    } else {
      applyTooltip = 'Choose a configuration different from the one currently in use.';
    }
  }

  return (
    <VStack
      as="section"
      gap={0}
      width="100%"
      xstyle={styles.runtimeRow}
      aria-label={`${providerRuntimeLabels[runtime.runtime]} Runtime`}
    >
      <RuntimeTitle runtime={runtime.runtime} />
      <HStack gap={3} vAlign="start" width="100%" xstyle={styles.rowDescription}>
        <RuntimeTargetSelector
          runtime={runtime.runtime}
          providerState={providerState}
          value={target}
          inUseTarget={getPersistedRuntimeTarget(runtime)}
          onChange={onTargetChange}
          onRetry={onRetryProviders}
        />
        <Button
          label="Apply"
          variant="secondary"
          isDisabled={!canApply}
          tooltip={applyTooltip}
          onClick={() => {
            if (canApply) {
              onApplyRequest({
                runtime: runtime.runtime,
                target: getRuntimeConfigurationTarget(target),
              });
            }
          }}
        />
      </HStack>
    </VStack>
  );
}

function LoadingRuntimeList() {
  return (
    <Grid
      columns={runtimeGridColumns}
      columnGap={6}
      rowGap={2}
      width="100%"
      xstyle={styles.runtimeGrid}
    >
      {providerRuntimes.map((runtime, index) => (
        <VStack
          as="section"
          key={runtime}
          gap={0}
          width="100%"
          xstyle={styles.runtimeRow}
          aria-label={`${providerRuntimeLabels[runtime]} Runtime`}
        >
          <RuntimeTitle runtime={runtime} />
          <HStack gap={3} vAlign="start" width="100%" xstyle={styles.rowDescription}>
            <LoadingTargetSelector index={index * 3} />
            <Skeleton
              width={sizeVars['--size-element-xl']}
              height={sizeVars['--size-element-md']}
              radius={2}
              index={index * 3 + 2}
            />
          </HStack>
        </VStack>
      ))}
    </Grid>
  );
}

export function RuntimesPage() {
  const queryClient = useQueryClient();
  const { state: runtimeState } = useRuntimeList();
  const { state: codexProviderState } = useProviderList('codex');
  const { state: claudeProviderState } = useProviderList('claude-code');
  const [draftTargets, setDraftTargets] = useState<RuntimeDraftTargets>({});
  const [previewInput, setPreviewInput] = useState<RuntimeConfigurationPreviewInput>();
  const [applyResult, setApplyResult] = useState<RuntimeApplyResult>();
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
      <Grid
        columns={runtimeGridColumns}
        columnGap={6}
        rowGap={2}
        width="100%"
        xstyle={styles.runtimeGrid}
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
            onApplyRequest={setPreviewInput}
            onRetryProviders={() => {
              void resetProviderList(queryClient, runtime.runtime);
            }}
          />
        ))}
      </Grid>
    );
  }

  return (
    <VStack width="100%" minHeight="100%" xstyle={styles.page}>
      <PageHeader
        text="Runtimes"
        action={(
          <Link
            as={RouterLink}
            href={routePaths.agentRuntimeProviders}
            isStandalone
            color="primary"
            weight="medium"
          >
            <HStack as="span" gap={1} vAlign="center">
              Manage Providers
              <Icon icon={ArrowRight} size="xsm" color="inherit" />
            </HStack>
          </Link>
        )}
      />
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
            setApplyResult({
              runtime: summary.runtime,
              source: summary.status === 'official-default'
                ? 'defaults-restored'
                : 'provider-applied',
            });
          }}
        />
      )}
      {applyResult && (
        <RuntimeApplyResultDialog
          key={`${applyResult.runtime}:${applyResult.source}`}
          result={applyResult}
          onClose={() => setApplyResult(undefined)}
        />
      )}
    </VStack>
  );
}
