import { FileInputIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ImportDialog } from '@/features/data-import/import-dialog';

import { SettingsItem } from '../../components/settings-item';

export function ImportItem({ disabled = false }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  return (
    <SettingsItem label={t('settings.import')}>
      <input
        ref={inputRef}
        type="file"
        accept=".foundry-backup,application/octet-stream"
        hidden
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />
      <Button type="button" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <FileInputIcon />
        {t('settings.import')}
      </Button>
      {file && <ImportDialog file={file} onClose={() => setFile(null)} />}
    </SettingsItem>
  );
}
