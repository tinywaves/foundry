import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { PageEmptyState } from '@renderer/components/page-empty-state';
import { PageHeader } from '@renderer/components/page-header';
import { agentExtensionIcons } from '@renderer/navigation-icons';

export function SkillsPage() {
  return (
    <VStack width="100%" height="100%">
      <PageHeader text="Skills" />
      <StackItem size="fill">
        <PageEmptyState
          icon={agentExtensionIcons.skills}
          text="Skills Aren't Available Yet"
        />
      </StackItem>
    </VStack>
  );
}
