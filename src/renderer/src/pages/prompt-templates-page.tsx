import { FileText } from 'lucide-react';
import { UnavailableFeaturePage } from '@renderer/pages/unavailable-feature-page';

export function PromptTemplatesPage() {
  return (
    <UnavailableFeaturePage
      title="Prompt Templates"
      unavailableTitle="Prompt Templates Aren't Available Yet"
      description="Prompt Template creation and management aren't connected in this build."
      icon={FileText}
    />
  );
}
