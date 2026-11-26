import { useI18n } from '../../i18n';

export default function PromptsPage() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{t('prompts.description')}</span>
    </div>
  );
}
