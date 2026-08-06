import { Avatar } from '@astryxdesign/core/Avatar';
import { HoverCard } from '@astryxdesign/core/HoverCard';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Link } from '@astryxdesign/core/Link';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import {
  pixel,
  proportional,
  Table,
} from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import {
  borderVars,
  colorVars,
  radiusVars,
  spacingVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { Copy, Eye, EyeOff, Info } from 'lucide-react';
import { useMemo } from 'react';
import type {
  ProviderConnectionStatus,
  ProviderRuntime,
  ProviderSummary,
} from '../../../../shared/provider-contract';
import { providerRuntimeLabels } from './provider-runtime';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
});

const SKELETONS_PER_ROW = 8;

const styles = stylex.create({
  nameCell: {
    minWidth: 0,
    maxWidth: '100%',
    width: 'fit-content',
    borderRadius: radiusVars['--radius-element'],
  },
  metadataTrigger: {
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
    outlineOffset: {
      'default': 0,
      ':focus-visible': spacingVars['--spacing-1'],
    },
  },
  apiKeyText: {
    minWidth: 0,
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

interface ProviderTableRow extends Record<string, unknown> {
  id: string;
  provider: ProviderSummary;
  avatarUrl: string | undefined;
  revealedApiKey: string | undefined;
  isRevealing: boolean;
  isCopying: boolean;
  isTesting: boolean;
  isDeleting: boolean;
  onEdit: (provider: ProviderSummary) => void;
  onCopyApiKey: (provider: ProviderSummary) => void;
  onToggleRevealApiKey: (provider: ProviderSummary) => void;
  onTestConnection: (provider: ProviderSummary) => void;
  onDelete: (provider: ProviderSummary) => void;
}

interface LoadingTableRow extends Record<string, unknown> {
  id: string;
  skeletonIndex: number;
}

function formatApiKey(provider: ProviderSummary): string {
  if (!provider.hasApiKey) {
    return 'Not set';
  }
  const mask = '\u{2022}'.repeat(4);
  return provider.apiKeySuffix ? `${mask} ${provider.apiKeySuffix}` : mask;
}

function formatLastTested(timestamp: number | null): string {
  if (timestamp === null) {
    return 'Never';
  }
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

function ProviderName({ provider, avatarUrl }: ProviderTableRow) {
  const website = getExternalWebsite(provider.officialWebsite);
  const hasMetadata = provider.remark !== null || website !== null;
  const nameCell = (
    <HStack
      gap={2}
      vAlign="center"
      tabIndex={hasMetadata ? 0 : undefined}
      aria-label={hasMetadata ? `${provider.name} provider details` : undefined}
      xstyle={[styles.nameCell, hasMetadata && styles.metadataTrigger]}
    >
      <Avatar src={avatarUrl} alt="" size="sm" tooltip={false} />
      <Text
        type="label"
        maxLines={1}
        hasTruncateTooltip={!hasMetadata}
      >
        {provider.name}
      </Text>
      {hasMetadata && <Icon icon={Info} size="xsm" color="tertiary" />}
    </HStack>
  );

  if (!hasMetadata) {
    return nameCell;
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
              <Link href={website} isExternalLink isStandalone maxLines={2}>
                {website}
              </Link>
            </>
          )}
        </VStack>
      )}
    >
      {nameCell}
    </HoverCard>
  );
}

function ProviderApiKey({
  provider,
  revealedApiKey,
  isRevealing,
  isCopying,
  onCopyApiKey,
  onToggleRevealApiKey,
}: ProviderTableRow) {
  if (!provider.hasApiKey) {
    return <Text type="code" color="secondary">Not set</Text>;
  }

  const isRevealed = revealedApiKey !== undefined;
  return (
    <HStack gap={1} vAlign="center" width="100%">
      <StackItem size="fill" xstyle={styles.apiKeyText}>
        <Text type="code" color="secondary" maxLines={1}>
          {isRevealed ? revealedApiKey : formatApiKey(provider)}
        </Text>
      </StackItem>
      <IconButton
        label={`Copy API key for ${provider.name}`}
        tooltip="Copy API key"
        icon={<Icon icon={Copy} size="sm" color="inherit" />}
        variant="ghost"
        size="sm"
        isLoading={isCopying}
        onClick={() => onCopyApiKey(provider)}
      />
      <IconButton
        label={`${isRevealed ? 'Hide' : 'Reveal'} API key for ${provider.name}`}
        tooltip={isRevealed ? 'Hide API key' : 'Reveal API key'}
        icon={<Icon icon={isRevealed ? EyeOff : Eye} size="sm" color="inherit" />}
        variant="ghost"
        size="sm"
        isLoading={isRevealing}
        onClick={() => onToggleRevealApiKey(provider)}
      />
    </HStack>
  );
}

function ProviderStatus({ provider, isTesting }: ProviderTableRow) {
  const status = isTesting
    ? { label: 'Testing', variant: 'neutral' as const }
    : getStatusPresentation(provider.connection.status);
  const statusLine = (
    <HStack
      gap={2}
      vAlign="center"
      tabIndex={!isTesting && provider.connection.lastError ? 0 : undefined}
      aria-label={
        !isTesting && provider.connection.lastError
          ? `Failed: ${provider.connection.lastError}`
          : status.label
      }
      xstyle={!isTesting && provider.connection.lastError !== null && styles.statusTrigger}
    >
      <StatusDot variant={status.variant} label={status.label} />
      <Text type="supporting" weight="medium" maxLines={1}>{status.label}</Text>
    </HStack>
  );

  return (
    <VStack gap={0.5}>
      {isTesting || provider.connection.lastError === null
        ? statusLine
        : (
            <Tooltip
              content={provider.connection.lastError}
              placement="above"
              focusTrigger="always"
              hasHoverIndication={false}
            >
              {statusLine}
            </Tooltip>
          )}
      {provider.connection.lastTestedAt !== null && (
        <Text
          type="supporting"
          color="secondary"
          maxLines={1}
          hasTabularNumbers
          hasTruncateTooltip
        >
          {formatLastTested(provider.connection.lastTestedAt)}
        </Text>
      )}
    </VStack>
  );
}

const providerColumns: Array<TableColumn<ProviderTableRow>> = [
  {
    key: 'name',
    header: 'Name',
    width: proportional(2),
    renderCell: (row) => <ProviderName {...row} />,
  },
  {
    key: 'baseUrl',
    header: 'Base URL',
    width: proportional(2),
    renderCell: ({ provider }) => (
      <Text type="code" color="secondary" maxLines={1} hasTruncateTooltip>
        {provider.baseUrl}
      </Text>
    ),
  },
  {
    key: 'apiKey',
    header: 'API key',
    width: pixel(192),
    renderCell: (row) => <ProviderApiKey {...row} />,
  },
  {
    key: 'connection',
    header: 'Connection',
    width: pixel(152),
    renderCell: (row) => <ProviderStatus {...row} />,
  },
  {
    key: 'actions',
    header: '',
    width: pixel(56),
    align: 'center',
    resizable: false,
    renderCell: ({
      provider,
      isTesting,
      isDeleting,
      onEdit,
      onTestConnection,
      onDelete,
    }) => (
      <MoreMenu
        label={`More actions for ${provider.name}`}
        size="sm"
        isDisabled={isTesting || isDeleting}
        items={[
          { label: 'Edit', onClick: () => onEdit(provider) },
          { label: 'Test connection', onClick: () => onTestConnection(provider) },
          { type: 'divider' },
          { label: 'Delete', onClick: () => onDelete(provider) },
        ]}
      />
    ),
  },
];

const loadingRows: LoadingTableRow[] = [0, 1, 2, 3].map((index) => ({
  id: `loading-${index}`,
  skeletonIndex: index,
}));

const loadingColumns: Array<TableColumn<LoadingTableRow>> = [
  {
    key: 'name',
    header: 'Name',
    width: proportional(2),
    renderCell: ({ skeletonIndex }) => (
      <HStack gap={2} vAlign="center">
        <Skeleton
          width={spacingVars['--spacing-6']}
          height={spacingVars['--spacing-6']}
          radius="rounded"
          index={skeletonIndex * SKELETONS_PER_ROW}
        />
        <Skeleton
          width="60%"
          height={spacingVars['--spacing-4']}
          radius={1}
          index={skeletonIndex * SKELETONS_PER_ROW + 1}
        />
      </HStack>
    ),
  },
  {
    key: 'baseUrl',
    header: 'Base URL',
    width: proportional(2),
    renderCell: ({ skeletonIndex }) => (
      <Skeleton
        width="80%"
        height={spacingVars['--spacing-4']}
        radius={1}
        index={skeletonIndex * SKELETONS_PER_ROW + 2}
      />
    ),
  },
  {
    key: 'apiKey',
    header: 'API key',
    width: pixel(192),
    renderCell: ({ skeletonIndex }) => (
      <HStack gap={1} vAlign="center" width="100%">
        <StackItem size="fill">
          <Skeleton
            width="70%"
            height={spacingVars['--spacing-4']}
            radius={1}
            index={skeletonIndex * SKELETONS_PER_ROW + 3}
          />
        </StackItem>
        <Skeleton
          width={spacingVars['--spacing-6']}
          height={spacingVars['--spacing-6']}
          radius="rounded"
          index={skeletonIndex * SKELETONS_PER_ROW + 4}
        />
        <Skeleton
          width={spacingVars['--spacing-6']}
          height={spacingVars['--spacing-6']}
          radius="rounded"
          index={skeletonIndex * SKELETONS_PER_ROW + 5}
        />
      </HStack>
    ),
  },
  {
    key: 'connection',
    header: 'Connection',
    width: pixel(152),
    renderCell: ({ skeletonIndex }) => (
      <VStack gap={1}>
        <Skeleton
          width="70%"
          height={spacingVars['--spacing-4']}
          radius={1}
          index={skeletonIndex * SKELETONS_PER_ROW + 6}
        />
        <Skeleton
          width="85%"
          height={spacingVars['--spacing-3']}
          radius={1}
          index={skeletonIndex * SKELETONS_PER_ROW + 7}
        />
      </VStack>
    ),
  },
  {
    key: 'actions',
    header: '',
    width: pixel(56),
    align: 'center',
    resizable: false,
    renderCell: () => (
      <Skeleton
        width={spacingVars['--spacing-6']}
        height={spacingVars['--spacing-6']}
        radius={1}
      />
    ),
  },
];

export function ProviderTable({
  providers,
  avatarUrls,
  runtime,
  revealedApiKey,
  revealingProviderId,
  copyingProviderIds,
  testingProviderIds,
  deletingProviderId,
  onEdit,
  onCopyApiKey,
  onToggleRevealApiKey,
  onTestConnection,
  onDelete,
}: {
  providers: ProviderSummary[];
  avatarUrls: Record<string, string>;
  runtime: ProviderRuntime;
  revealedApiKey: { id: string; value: string } | undefined;
  revealingProviderId: string | undefined;
  copyingProviderIds: ReadonlySet<string>;
  testingProviderIds: ReadonlySet<string>;
  deletingProviderId: string | undefined;
  onEdit: (provider: ProviderSummary) => void;
  onCopyApiKey: (provider: ProviderSummary) => void;
  onToggleRevealApiKey: (provider: ProviderSummary) => void;
  onTestConnection: (provider: ProviderSummary) => void;
  onDelete: (provider: ProviderSummary) => void;
}) {
  const rows = useMemo<ProviderTableRow[]>(() => providers.map((provider) => ({
    id: provider.id,
    provider,
    avatarUrl: avatarUrls[provider.id],
    revealedApiKey: revealedApiKey?.id === provider.id ? revealedApiKey.value : undefined,
    isRevealing: revealingProviderId === provider.id,
    isCopying: copyingProviderIds.has(provider.id),
    isTesting: testingProviderIds.has(provider.id),
    isDeleting: deletingProviderId === provider.id,
    onEdit,
    onCopyApiKey,
    onToggleRevealApiKey,
    onTestConnection,
    onDelete,
  })), [
    avatarUrls,
    copyingProviderIds,
    deletingProviderId,
    onCopyApiKey,
    onDelete,
    onEdit,
    onTestConnection,
    onToggleRevealApiKey,
    providers,
    revealedApiKey,
    revealingProviderId,
    testingProviderIds,
  ]);

  return (
    <Table
      data={rows}
      columns={providerColumns}
      idKey="id"
      rowCount={rows.length}
      density="balanced"
      dividers="rows"
      hasHover
      textOverflow="truncate"
      aria-label={`${providerRuntimeLabels[runtime]} providers`}
    />
  );
}

export function LoadingProviderTable({ runtime }: { runtime: ProviderRuntime }) {
  return (
    <Table
      data={loadingRows}
      columns={loadingColumns}
      idKey="id"
      density="balanced"
      dividers="rows"
      aria-label={`Loading ${providerRuntimeLabels[runtime]} providers`}
      aria-busy="true"
    />
  );
}
