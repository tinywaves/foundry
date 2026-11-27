import { FolderOpenIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import { SettingsItem } from '../../components/settings-item';

export function ConfigFolderItem() {
  const { t } = useTranslation();

  return (
    <SettingsItem label={t('settings.configFolder')}>
      <Button type="button" variant="outline" disabled>
        <FolderOpenIcon />
        {t('settings.openFolder')}
      </Button>
    </SettingsItem>
  );
}
