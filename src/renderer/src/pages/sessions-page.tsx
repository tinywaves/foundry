import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { PageEmptyState } from '@renderer/components/page-empty-state';
import { PageHeader } from '@renderer/components/page-header';
import { agentObservabilityIcons } from '@renderer/navigation-icons';

export function SessionsPage() {
  return (
    <VStack width="100%" height="100%">
      <PageHeader text="Sessions" />
      <StackItem size="fill">
        <PageEmptyState
          icon={agentObservabilityIcons.sessions}
          text="Sessions Aren't Available Yet"
        />
      </StackItem>
    </VStack>
  );
}
