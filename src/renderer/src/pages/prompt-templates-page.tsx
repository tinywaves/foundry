import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { FileText } from 'lucide-react';
import { PageEmptyState } from '@renderer/components/page-empty-state';
import { PageHeader } from '@renderer/components/page-header';

export function PromptTemplatesPage() {
  return (
    <VStack width="100%" height="100%">
      <PageHeader text="Prompt Templates" />
      <StackItem size="fill">
        <PageEmptyState icon={FileText} text="Prompt Templates Aren't Available Yet" />
      </StackItem>
    </VStack>
  );
}
