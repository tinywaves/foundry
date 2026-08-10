import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Section } from '@astryxdesign/core/Section';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { proportional, Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, PlugZap } from 'lucide-react';
import type { ReactNode } from 'react';
import { routePaths } from '@renderer/routes';
import type { ProviderRuntime } from '../../../shared/provider-contract';
import {
  providerRuntimeIconUrls,
  providerRuntimeLabels,
} from './providers/provider-runtime';
import { resetProviderList } from './providers/provider-query';
import { useProviderList } from './providers/use-provider-list';

const EMPTY_VALUE = '\u{2014}';

const styles = stylex.create({
  page: {
    minWidth: 0,
  },
  runtimeIcon: {
    display: 'block',
    width: spacingVars['--spacing-6'],
    height: spacingVars['--spacing-6'],
  },
});

type ProviderListState = ReturnType<typeof useProviderList>['state'];
type RuntimeHealth
  = | 'healthy'
    | 'loading'
    | 'needs-attention'
    | 'not-configured'
    | 'unavailable'
    | 'untested';

interface RuntimeDashboardRow extends Record<string, unknown> {
  id: ProviderRuntime;
  runtime: ProviderRuntime;
  providerCount: number | null;
  connectedCount: number | null;
  failedCount: number | null;
  health: RuntimeHealth;
}

interface MetricCardProps {
  label: string;
  value: number | null;
  icon: ReactNode;
  isLoading: boolean;
}

function createRuntimeRow(
  runtime: ProviderRuntime,
  state: ProviderListState,
): RuntimeDashboardRow {
  if (state.status === 'loading') {
    return {
      id: runtime,
      runtime,
      providerCount: null,
      connectedCount: null,
      failedCount: null,
      health: 'loading',
    };
  }
  if (state.status === 'error') {
    return {
      id: runtime,
      runtime,
      providerCount: null,
      connectedCount: null,
      failedCount: null,
      health: 'unavailable',
    };
  }

  let connectedCount = 0;
  let failedCount = 0;
  for (const provider of state.providers) {
    if (provider.connection.status === 'connected') {
      connectedCount += 1;
    } else if (provider.connection.status === 'failed') {
      failedCount += 1;
    }
  }

  let health: RuntimeHealth = 'untested';
  if (state.providers.length === 0) {
    health = 'not-configured';
  } else if (failedCount > 0) {
    health = 'needs-attention';
  } else if (connectedCount === state.providers.length) {
    health = 'healthy';
  }

  return {
    id: runtime,
    runtime,
    providerCount: state.providers.length,
    connectedCount,
    failedCount,
    health,
  };
}

function MetricCard({ label, value, icon, isLoading }: MetricCardProps) {
  return (
    <Card padding={4}>
      <HStack gap={3} vAlign="center">
        {icon}
        <VStack gap={0.5}>
          <Text type="supporting" color="secondary">{label}</Text>
          {isLoading
            ? (
                <Skeleton
                  width={spacingVars['--spacing-10']}
                  height={spacingVars['--spacing-5']}
                  radius={1}
                />
              )
            : (
                <Text type="large" weight="semibold" hasTabularNumbers>
                  {value ?? EMPTY_VALUE}
                </Text>
              )}
        </VStack>
      </HStack>
    </Card>
  );
}

function RuntimeCount({ value, isLoading }: { value: number | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Skeleton
        width={spacingVars['--spacing-6']}
        height={spacingVars['--spacing-4']}
        radius={1}
      />
    );
  }
  return <Text hasTabularNumbers>{value ?? EMPTY_VALUE}</Text>;
}

function RuntimeHealthStatus({ health }: { health: RuntimeHealth }) {
  if (health === 'loading') {
    return (
      <Skeleton
        width="60%"
        height={spacingVars['--spacing-4']}
        radius={1}
      />
    );
  }

  const presentation = {
    'healthy': { label: 'Healthy', variant: 'success' as const },
    'needs-attention': { label: 'Needs Attention', variant: 'error' as const },
    'not-configured': { label: 'Not Configured', variant: 'neutral' as const },
    'unavailable': { label: 'Unavailable', variant: 'error' as const },
    'untested': { label: 'Not Fully Tested', variant: 'warning' as const },
  }[health];

  return (
    <HStack gap={2} vAlign="center">
      <StatusDot variant={presentation.variant} label={presentation.label} />
      <Text type="supporting" weight="medium">{presentation.label}</Text>
    </HStack>
  );
}

const runtimeColumns: Array<TableColumn<RuntimeDashboardRow>> = [
  {
    key: 'runtime',
    header: 'Runtime',
    width: proportional(2),
    renderCell: ({ runtime }) => (
      <HStack gap={2} vAlign="center">
        <img
          {...stylex.props(styles.runtimeIcon)}
          src={providerRuntimeIconUrls[runtime]}
          alt=""
          width={24}
          height={24}
          draggable={false}
        />
        <Text type="label">{providerRuntimeLabels[runtime]}</Text>
      </HStack>
    ),
  },
  {
    key: 'providers',
    header: 'Providers',
    width: proportional(1),
    renderCell: ({ providerCount, health }) => (
      <RuntimeCount value={providerCount} isLoading={health === 'loading'} />
    ),
  },
  {
    key: 'connected',
    header: 'Connected',
    width: proportional(1),
    renderCell: ({ connectedCount, health }) => (
      <RuntimeCount value={connectedCount} isLoading={health === 'loading'} />
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: proportional(2),
    renderCell: ({ health }) => <RuntimeHealthStatus health={health} />,
  },
];

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { state: codexState } = useProviderList('codex');
  const { state: claudeState } = useProviderList('claude-code');
  const runtimeRows = [
    createRuntimeRow('codex', codexState),
    createRuntimeRow('claude-code', claudeState),
  ];
  const isLoading = runtimeRows.some((row) => row.health === 'loading');
  const hasError = runtimeRows.some((row) => row.health === 'unavailable');
  const hasCompleteData = runtimeRows.every((row) => row.providerCount !== null);
  const totalProviders = hasCompleteData
    ? runtimeRows.reduce((total, row) => total + (row.providerCount ?? 0), 0)
    : null;
  const connectedProviders = hasCompleteData
    ? runtimeRows.reduce((total, row) => total + (row.connectedCount ?? 0), 0)
    : null;
  const failedProviders = hasCompleteData
    ? runtimeRows.reduce((total, row) => total + (row.failedCount ?? 0), 0)
    : null;
  const errorMessages = [codexState, claudeState]
    .flatMap((state) => (state.status === 'error' ? [state.message] : []));

  const retry = () => {
    void Promise.all([
      resetProviderList(queryClient, 'codex'),
      resetProviderList(queryClient, 'claude-code'),
    ]);
  };

  return (
    <VStack width="100%" minHeight="100%" xstyle={styles.page}>
      <Section padding={4} paddingBlock={2} dividers={['bottom']}>
        <Heading level={1}>Dashboard</Heading>
      </Section>
      <VStack gap={6} padding={4}>
        {hasError && (
          <Banner
            status="error"
            container="section"
            title="Couldn't Load All Runtime Data"
            description={`${errorMessages.join(' ')} Retry to refresh the dashboard.`}
            endContent={<Button label="Retry" variant="ghost" onClick={retry} />}
          />
        )}
        <Section variant="transparent" padding={0}>
          <VStack gap={3}>
            <Heading level={2}>Connection Health</Heading>
            <Grid columns={{ minWidth: 200, max: 3, repeat: 'fit' }} gap={3}>
              <MetricCard
                label="Total Providers"
                value={totalProviders}
                isLoading={isLoading}
                icon={<Icon icon={PlugZap} size="md" color="secondary" />}
              />
              <MetricCard
                label="Connected"
                value={connectedProviders}
                isLoading={isLoading}
                icon={<Icon icon={CircleCheck} size="md" color="success" />}
              />
              <MetricCard
                label="Needs Attention"
                value={failedProviders}
                isLoading={isLoading}
                icon={<Icon icon={CircleAlert} size="md" color="error" />}
              />
            </Grid>
          </VStack>
        </Section>
        <Section variant="transparent" padding={0}>
          <VStack gap={3}>
            <HStack hAlign="between" vAlign="center" gap={3}>
              <Heading level={2}>Runtime Status</Heading>
              <Link href={routePaths.agentsSwitchProviders} isStandalone>
                Manage Providers
              </Link>
            </HStack>
            <Table
              data={runtimeRows}
              columns={runtimeColumns}
              idKey="id"
              rowCount={runtimeRows.length}
              density="balanced"
              dividers="rows"
              aria-label="Provider runtime health"
              aria-busy={isLoading || undefined}
            />
          </VStack>
        </Section>
      </VStack>
    </VStack>
  );
}
