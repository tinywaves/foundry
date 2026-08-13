import { Wrench } from 'lucide-react';
import { UnavailableFeaturePage } from '@renderer/pages/unavailable-feature-page';

export function SkillsPage() {
  return (
    <UnavailableFeaturePage
      title="Skills"
      unavailableTitle="Skills Aren't Available Yet"
      description="Skill discovery and management aren't connected in this build."
      icon={Wrench}
    />
  );
}
