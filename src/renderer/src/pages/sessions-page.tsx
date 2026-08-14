import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { MessagesSquare } from 'lucide-react';
import { PageEmptyState } from '@renderer/components/page-empty-state';
import { PageHeader } from '@renderer/components/page-header';

export function SessionsPage() {
  return (
    <VStack width="100%" height="100%">
      <PageHeader text="Sessions" />
      <StackItem size="fill">
        <PageEmptyState icon={MessagesSquare} text="Sessions Aren't Available Yet" />
      </StackItem>
    </VStack>
  );
}
