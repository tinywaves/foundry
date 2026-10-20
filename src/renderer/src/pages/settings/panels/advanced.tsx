import { ArrowTopRightOnSquareIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Button } from '@astryxdesign/core/Button';
import { useI18n } from '@renderer/i18n/use-i18n';
import { SettingsCard } from '../components/settings-card';
import { SettingsRow } from '../components/settings-row';

export function AdvancedPanel({
  settingsPath,
  onOpenSettingsFile,
}: {
  settingsPath: string;
  onOpenSettingsFile: () => void;
}) {
  const { t } = useI18n();
  return (
    <SettingsCard>
      <SettingsRow
        title={t('settings.openSettingsFile')}
        icon={DocumentTextIcon}
        description={settingsPath}
        control={(
          <Button
            label={t('settings.open')}
            icon={<ArrowTopRightOnSquareIcon />}
            variant="ghost"
            size="sm"
            onClick={onOpenSettingsFile}
          />
        )}
      />
    </SettingsCard>
  );
}
