import { Avatar } from '@astryxdesign/core/Avatar';
import { Card } from '@astryxdesign/core/Card';
import { HoverCard } from '@astryxdesign/core/HoverCard';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Link } from '@astryxdesign/core/Link';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { useToast } from '@astryxdesign/core/Toast';
import {
  borderVars,
  colorVars,
  radiusVars,
  spacingVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, PlugZap, Trash2 } from 'lucide-react';
import type {
  ProviderConnectionStatus,
  ProviderRuntime,
  ProviderSummary,
} from '../../../../shared/provider-contract';
import {
  getSavedProviderTestMutationKey,
  isMatchingCustomProvider,
  ProviderRequestError,
  replaceCachedProvider,
  resolveProviderRequest,
} from './provider-query';
import { providerRuntimeLabels } from './provider-runtime';
import { useProviderAvatarUrl } from './use-provider-avatar-url';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
});

const LOADING_CARD_COUNT = 4;
const SKELETONS_PER_CARD = 7;

const styles = stylex.create({
  list: {
    minWidth: 0,
    listStyleType: 'none',
  },
  content: {
    minWidth: 0,
  },
  providerName: {
    minWidth: 0,
    maxWidth: '100%',
    flexShrink: 1,
  },
  nameTrigger: {
    width: 'fit-content',
    borderRadius: radiusVars['--radius-element'],
    cursor: 'help',
    outlineWidth: {
      'default': 0,
      ':focus-visible': borderVars['--border-width'],
    },
    outlineStyle: {
      'default': 'none',
      ':focus-visible': 'solid',
    },
    outlineColor: {
      'default': null,
      ':focus-visible': colorVars['--color-accent'],
    },
    outlineOffset: spacingVars['--spacing-1'],
  },
  statusTrigger: {
    width: 'fit-content',
    borderRadius: radiusVars['--radius-element'],
    cursor: 'help',
    outlineWidth: {
      'default': 0,
      ':focus-visible': borderVars['--border-width'],
    },
    outlineStyle: {
      'default': 'none',
      ':focus-visible': 'solid',
    },
    outlineColor: {
      'default': null,
      ':focus-visible': colorVars['--color-accent'],
    },
    outlineOffset: spacingVars['--spacing-1'],
  },
});

interface ProviderCardProps {
  provider: ProviderSummary;
  isDeleting: boolean;
  onEdit: (provider: ProviderSummary) => void;
  onDelete: (provider: ProviderSummary) => void;
}

function formatLastTested(timestamp: number): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Unknown' : dateTimeFormatter.format(date);
}

function getExternalWebsite(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function getStatusPresentation(status: ProviderConnectionStatus): {
  label: string;
  variant: 'neutral' | 'success' | 'error';
} {
  switch (status) {
    case 'connected': {
      return { label: 'Connected', variant: 'success' };
    }
    case 'failed': {
      return { label: 'Failed', variant: 'error' };
    }
    case 'never-tested': {
      return { label: 'Never tested', variant: 'neutral' };
    }
  }
}

function ProviderName({ provider }: { provider: ProviderSummary }) {
  const website = getExternalWebsite(provider.officialWebsite);
  const hasMetadata = provider.remark !== null || website !== null;
  const name = (
    <Text
      type="label"
      maxLines={1}
      hasTruncateTooltip={!hasMetadata}
      tabIndex={hasMetadata ? 0 : undefined}
      aria-label={hasMetadata ? `${provider.name} provider details` : undefined}
      xstyle={[styles.providerName, hasMetadata && styles.nameTrigger]}
    >
      {provider.name}
    </Text>
  );

  if (!hasMetadata) {
    return name;
  }

  return (
    <HoverCard
      placement="below"
      alignment="start"
      focusTrigger="always"
      hasHoverIndication={false}
      label={`${provider.name} provider details`}
      content={(
        <VStack gap={2} maxWidth="min(40ch, 80vw)">
          {provider.remark !== null && (
            <>
              <Text type="supporting" weight="medium" display="block">Remark</Text>
              <Text type="body" display="block" textWrap="pretty">
                {provider.remark}
              </Text>
            </>
          )}
          {website !== null && (
            <>
              <Text type="supporting" weight="medium" display="block">
                Official website
              </Text>
              <Link as="a" href={website} isExternalLink isStandalone maxLines={2}>
                {website}
              </Link>
            </>
          )}
        </VStack>
      )}
    >
      {name}
    </HoverCard>
  );
}

function ProviderStatus({ provider }: { provider: ProviderSummary }) {
  const status = getStatusPresentation(provider.connection.status);
  const details = [
    provider.connection.lastTestedAt === null
      ? null
      : `Last tested ${formatLastTested(provider.connection.lastTestedAt)}`,
    provider.connection.lastError === null
      ? null
      : `Failure: ${provider.connection.lastError}`,
  ].filter((detail): detail is string => detail !== null);
  const hasDetails = details.length > 0;
  const statusLine = (
    <HStack
      gap={2}
      vAlign="center"
      tabIndex={hasDetails ? 0 : undefined}
      aria-label={hasDetails ? `${status.label}. ${details.join('. ')}` : status.label}
      xstyle={hasDetails && styles.statusTrigger}
    >
      <StatusDot variant={status.variant} label={status.label} />
      <Text type="supporting" weight="medium" maxLines={1}>{status.label}</Text>
    </HStack>
  );

  if (!hasDetails) {
    return statusLine;
  }

  return (
    <Tooltip
      content={details.join(' · ')}
      placement="above"
      focusTrigger="always"
      hasHoverIndication={false}
    >
      {statusLine}
    </Tooltip>
  );
}

function ProviderActions({
  provider,
  isDeleting,
  onEdit,
  onDelete,
}: ProviderCardProps) {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const { isPending: isTesting, mutate: testConnection } = useMutation<
    ProviderSummary,
    ProviderRequestError,
    ProviderSummary
  >({
    mutationKey: getSavedProviderTestMutationKey(provider),
    mutationFn: async (currentProvider) => {
      const testedProvider = await resolveProviderRequest<ProviderSummary>(
        () => globalThis.api.providers.testSavedProviderConnection(currentProvider.id),
        'The connection could not be tested.',
      );
      if (!isMatchingCustomProvider(
        testedProvider,
        currentProvider.runtime,
        currentProvider.id,
      )) {
        throw new ProviderRequestError('The connection result was invalid.');
      }
      return testedProvider;
    },
    onSuccess: (testedProvider, currentProvider) => {
      replaceCachedProvider(queryClient, currentProvider.runtime, testedProvider);
    },
  });
  const isBusy = isTesting || isDeleting;

  return (
    <HStack gap={1} vAlign="center">
      <IconButton
        label={`Edit ${provider.name}`}
        tooltip="Edit Provider"
        icon={<Icon icon={Pencil} size="sm" color="inherit" />}
        variant="ghost"
        size="sm"
        isDisabled={isBusy}
        onClick={() => onEdit(provider)}
      />
      <IconButton
        label={`Test connection for ${provider.name}`}
        tooltip="Test Connection"
        icon={<Icon icon={PlugZap} size="sm" color="inherit" />}
        variant="ghost"
        size="sm"
        isLoading={isTesting}
        isDisabled={isBusy}
        onClick={() => {
          if (isBusy) {
            return;
          }
          testConnection(provider, {
            onError: (error) => {
              showToast({
                body: error.message,
                type: 'error',
                uniqueID: `provider-test-${provider.id}`,
              });
            },
          });
        }}
      />
      <IconButton
        label={`Delete ${provider.name}`}
        tooltip="Delete Provider"
        icon={<Icon icon={Trash2} size="sm" color="inherit" />}
        variant="ghost"
        size="sm"
        isDisabled={isBusy}
        onClick={() => onDelete(provider)}
      />
    </HStack>
  );
}

function ProviderCard({
  provider,
  isDeleting,
  onEdit,
  onDelete,
}: ProviderCardProps) {
  const avatarUrl = useProviderAvatarUrl(provider);

  return (
    <Card width="100%" padding={3} role="group" aria-label={`${provider.name} provider`}>
      <HStack gap={3} vAlign="center" width="100%">
        <Avatar src={avatarUrl} alt="" size="md" tooltip={false} />
        <StackItem size="fill" xstyle={styles.content}>
          <VStack gap={1} width="100%">
            <HStack gap={2} vAlign="center" width="100%">
              <ProviderName provider={provider} />
              <StackItem>
                <ProviderStatus provider={provider} />
              </StackItem>
            </HStack>
            <Link
              as="a"
              href={provider.baseUrl}
              isExternalLink
              isStandalone
              maxLines={1}
            >
              {provider.baseUrl}
            </Link>
          </VStack>
        </StackItem>
        <StackItem>
          <ProviderActions
            provider={provider}
            isDeleting={isDeleting}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </StackItem>
      </HStack>
    </Card>
  );
}

export function ProviderCardList({
  providers,
  runtime,
  deletingProviderId,
  onEdit,
  onDelete,
}: {
  providers: ProviderSummary[];
  runtime: ProviderRuntime;
  deletingProviderId: string | undefined;
  onEdit: (provider: ProviderSummary) => void;
  onDelete: (provider: ProviderSummary) => void;
}) {
  return (
    <VStack
      as="ul"
      gap={2}
      padding={4}
      width="100%"
      aria-label={`${providerRuntimeLabels[runtime]} providers`}
      xstyle={styles.list}
    >
      {providers.map((provider) => (
        <StackItem as="li" key={provider.id}>
          <ProviderCard
            provider={provider}
            isDeleting={deletingProviderId === provider.id}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </StackItem>
      ))}
    </VStack>
  );
}

function LoadingProviderCard({ index }: { index: number }) {
  const skeletonIndex = index * SKELETONS_PER_CARD;

  return (
    <Card width="100%" padding={3}>
      <HStack gap={3} vAlign="center" width="100%">
        <Skeleton
          width={spacingVars['--spacing-9']}
          height={spacingVars['--spacing-9']}
          radius="rounded"
          index={skeletonIndex}
        />
        <StackItem size="fill">
          <VStack gap={1} width="100%">
            <HStack gap={2} vAlign="center" width="100%">
              <Skeleton
                width="35%"
                height={spacingVars['--spacing-4']}
                radius={1}
                index={skeletonIndex + 1}
              />
              <Skeleton
                width="18%"
                height={spacingVars['--spacing-4']}
                radius={1}
                index={skeletonIndex + 2}
              />
            </HStack>
            <Skeleton
              width="75%"
              height={spacingVars['--spacing-3']}
              radius={1}
              index={skeletonIndex + 3}
            />
          </VStack>
        </StackItem>
        <StackItem>
          <HStack gap={1} vAlign="center">
            {[4, 5, 6].map((offset) => (
              <Skeleton
                key={offset}
                width={spacingVars['--spacing-6']}
                height={spacingVars['--spacing-6']}
                radius={1}
                index={skeletonIndex + offset}
              />
            ))}
          </HStack>
        </StackItem>
      </HStack>
    </Card>
  );
}

export function LoadingProviderCardList({ runtime }: { runtime: ProviderRuntime }) {
  return (
    <VStack
      as="ul"
      gap={2}
      padding={4}
      width="100%"
      aria-label={`Loading ${providerRuntimeLabels[runtime]} providers…`}
      aria-busy="true"
      xstyle={styles.list}
    >
      {Array.from({ length: LOADING_CARD_COUNT }, (_, index) => (
        <StackItem as="li" key={index}>
          <LoadingProviderCard index={index} />
        </StackItem>
      ))}
    </VStack>
  );
}
