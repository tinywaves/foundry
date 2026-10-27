import { CloudIcon, CpuChipIcon, PlusIcon, ServerStackIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { EmptyStateCard } from '@renderer/components/empty-state-card';
import { EmptyStateGraphic } from '@renderer/components/empty-state-graphic';
import { useI18n } from '@renderer/i18n/use-i18n';

function ProviderConnectionGraphic() {
  return (
    <EmptyStateGraphic
      startIcon={CloudIcon}
      centerIcon={ServerStackIcon}
      endIcon={CpuChipIcon}
    />
  );
}

export function ProviderEmptyState() {
  const { t } = useI18n();

  return (
    <EmptyStateCard
      icon={<ProviderConnectionGraphic />}
      title={t('providers.emptyTitle')}
      description={t('providers.empty')}
      actions={(
        <Button
          label={t('providers.addFirst')}
          size="sm"
          variant="primary"
          icon={<PlusIcon />}
          href="/providers/new"
          as={Link}
        />
      )}
    />
  );
}
