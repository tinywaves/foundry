import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import type { SkillStorePackageView } from '../../../../shared/skill-contract';

export function SkillStoreCorruptionDialog({
  isOpen,
  skillPackage,
  onDelete,
  onDismiss,
}: {
  isOpen: boolean;
  skillPackage: SkillStorePackageView;
  onDelete: () => void;
  onDismiss: () => void;
}) {
  return (
    <AlertDialog
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!nextIsOpen) {
          onDismiss();
        }
      }}
      title="Stored Skill Content Is Corrupt"
      description={`Foundry cannot decode the stored content for "${skillPackage.distributionName}". Delete the Skill Package or dismiss this message.`}
      actionLabel="Delete Skill"
      cancelLabel="Dismiss"
      actionVariant="destructive"
      onAction={onDelete}
    />
  );
}
