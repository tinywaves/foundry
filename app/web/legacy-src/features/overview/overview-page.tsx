import { Heading } from '@/components/workbench';
import { useI18n } from '../../i18n';

export default function OverviewPage() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Heading level={1}>{t('overview.title')}</Heading>
        <span className="text-xs text-muted-foreground">{t('overview.description')}</span>
      </div>
    </div>
  );
}
