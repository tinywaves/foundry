import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack } from '@astryxdesign/core/Stack';

export function EmptyStateCard({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <HStack width="100%" hAlign="center">
      <Card width="100%" maxWidth={720} padding={0}>
        <EmptyState
          headingLevel={2}
          icon={icon}
          title={title}
          description={description}
          actions={actions}
        />
      </Card>
    </HStack>
  );
}
