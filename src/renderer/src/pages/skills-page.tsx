import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { Wrench } from 'lucide-react';
import { PageEmptyState } from '@renderer/components/page-empty-state';
import { PageHeader } from '@renderer/components/page-header';

export function SkillsPage() {
  return (
    <VStack width="100%" height="100%">
      <PageHeader text="Skills" />
      <StackItem size="fill">
        <PageEmptyState icon={Wrench} text="Skills Aren't Available Yet" />
      </StackItem>
    </VStack>
  );
}
