import { FolderIcon, FolderOpenIcon } from '@heroicons/react/24/outline';
import { Button } from '@astryxdesign/core/Button';
import { useI18n } from '@renderer/i18n/use-i18n';
import { SettingsCard } from '../components/settings-card';
import { SettingsRow } from '../components/settings-row';

export function AdvancedPanel({
  configFolderPath,
  onOpenConfigFolder,
}: {
  configFolderPath: string;
  onOpenConfigFolder: () => void;
}) {
  const { t } = useI18n();
  return (
    <SettingsCard>
      <SettingsRow
        title={t('settings.configFolder')}
        icon={FolderIcon}
        description={configFolderPath}
        control={(
          <Button
            label={t('settings.openConfigFolder')}
            icon={<FolderOpenIcon />}
            variant="ghost"
            size="sm"
            onClick={onOpenConfigFolder}
          />
        )}
      />
    </SettingsCard>
  );
}
