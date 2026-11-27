import { DownloadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import { SettingsItem } from '../../components/settings-item';

export function ExportItem() {
  const { t } = useTranslation();

  return (
    <SettingsItem label={t('settings.export')}>
      <Button type="button" variant="outline" disabled>
        <DownloadIcon />
        {t('settings.export')}
      </Button>
    </SettingsItem>
  );
}
