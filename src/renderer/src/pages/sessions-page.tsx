import { MessagesSquare } from 'lucide-react';
import { UnavailableFeaturePage } from '@renderer/pages/unavailable-feature-page';

export function SessionsPage() {
  return (
    <UnavailableFeaturePage
      title="Sessions"
      unavailableTitle="Sessions Aren't Available Yet"
      description="Agent Session collection and analysis aren't connected in this build."
      icon={MessagesSquare}
    />
  );
}
