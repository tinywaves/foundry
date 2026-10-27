import { InboxStackIcon, LinkIcon, PlusIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline';
import { Button } from '@astryxdesign/core/Button';
import { EmptyStateCard } from '@renderer/components/empty-state-card';
import { EmptyStateGraphic } from '@renderer/components/empty-state-graphic';
import { useI18n } from '@renderer/i18n/use-i18n';

export function CapturesEmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();

  return (
    <EmptyStateCard
      icon={(
        <EmptyStateGraphic
          startIcon={LinkIcon}
          centerIcon={InboxStackIcon}
          endIcon={Square3Stack3DIcon}
        />
      )}
      title={t('captures.emptyTitle')}
      description={t('captures.emptyDescription')}
      actions={(
        <Button
          label={t('captures.addCapture')}
          size="sm"
          variant="primary"
          icon={<PlusIcon />}
          onClick={onAdd}
        />
      )}
    />
  );
}
