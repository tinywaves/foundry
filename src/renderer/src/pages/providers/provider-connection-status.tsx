import { HStack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import * as stylex from '@stylexjs/stylex';
import type { ProviderConnectionSummary } from '../../../../shared/provider-contract';
import { getProviderConnectionStatusPresentation } from './provider-connection-status-model';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
});

const styles = stylex.create({
  statusTrigger: {
    width: 'fit-content',
    cursor: 'help',
  },
});

function formatLastTested(timestamp: number): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Unknown' : dateTimeFormatter.format(date);
}

export function ProviderConnectionStatus({
  provider,
}: {
  provider: { connection: ProviderConnectionSummary };
}) {
  const status = getProviderConnectionStatusPresentation(provider.connection.status);
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
