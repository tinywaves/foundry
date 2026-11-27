import { FileOutputIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import { SettingsItem } from '../../components/settings-item';
import { ExportDialog } from '@/features/data-export/export-dialog';

export function ExportItem({ disabled = false }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SettingsItem label={t('settings.export')}>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => setIsOpen(true)}>
        <FileOutputIcon />
        {t('settings.export')}
      </Button>
      {isOpen && <ExportDialog onClose={() => setIsOpen(false)} />}
    </SettingsItem>
  );
}
