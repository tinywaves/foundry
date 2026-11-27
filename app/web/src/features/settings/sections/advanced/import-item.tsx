import { UploadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import { SettingsItem } from '../../components/settings-item';

export function ImportItem() {
  const { t } = useTranslation();

  return (
    <SettingsItem label={t('settings.import')}>
      <Button type="button" variant="outline" disabled>
        <UploadIcon />
        {t('settings.import')}
      </Button>
    </SettingsItem>
  );
}
