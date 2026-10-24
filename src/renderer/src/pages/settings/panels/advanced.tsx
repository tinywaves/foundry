import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  FolderIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@astryxdesign/core/Button';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  dataTransferKeys,
  getDataTransferStatus,
  selectImportFile,
} from '@renderer/apis/data-transfer';
import { useI18n } from '@renderer/i18n/use-i18n';
import { useAppToast } from '@renderer/hooks/use-app-toast';
import { SettingsCard } from '../components/settings-card';
import { SettingsRow } from '../components/settings-row';
import {
  ExportDataDialog,
  ImportDataDialog,
} from '../components/data-transfer-dialogs';

export function AdvancedPanel({
  configFolderPath,
  onOpenConfigFolder,
}: {
  configFolderPath: string;
  onOpenConfigFolder: () => void;
}) {
  const { t } = useI18n();
  const toast = useAppToast();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSelectingImport, setIsSelectingImport] = useState(false);
  const [selectedImport, setSelectedImport] = useState<{
    fileName: string;
    filePath: string;
  } | null>(null);
  const statusQuery = useQuery({
    queryKey: dataTransferKeys.status(),
    queryFn: getDataTransferStatus,
    refetchInterval: 5000,
  });
  const activeJobCount = statusQuery.data?.activeJobCount ?? 0;
  const isTransferBlocked = statusQuery.isLoading
    || statusQuery.data?.isBusy === true
    || activeJobCount > 0;
  const blockedDescription = t('settings.finishJobsBeforeTransfer');
  const exportDescription = activeJobCount > 0
    ? blockedDescription
    : t('settings.exportDataDescription');
  const importDescription = activeJobCount > 0
    ? blockedDescription
    : t('settings.importDataDescription');
  const chooseImportFile = async () => {
    setIsSelectingImport(true);
    try {
      const result = await selectImportFile();
      if (result.status === 'selected') {
        setSelectedImport({
          fileName: result.fileName,
          filePath: result.filePath,
        });
      }
    } catch {
      toast({
        body: t('dataTransfer.ioError'),
        type: 'error',
        uniqueID: 'data-transfer-select-file-error',
      });
    } finally {
      setIsSelectingImport(false);
    }
  };

  return (
    <>
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
        <SettingsRow
          title={t('settings.exportData')}
          icon={ArrowUpTrayIcon}
          description={exportDescription}
          control={(
            <Button
              label={t('settings.exportDataAction')}
              icon={<ArrowUpTrayIcon />}
              variant="ghost"
              size="sm"
              isDisabled={isTransferBlocked}
              onClick={() => setIsExportOpen(true)}
            />
          )}
        />
        <SettingsRow
          title={t('settings.importData')}
          icon={ArrowDownTrayIcon}
          description={importDescription}
          control={(
            <Button
              label={t('settings.importDataAction')}
              icon={<ArrowDownTrayIcon />}
              variant="ghost"
              size="sm"
              isDisabled={isTransferBlocked || isSelectingImport}
              isLoading={isSelectingImport}
              onClick={() => {
                void chooseImportFile();
              }}
            />
          )}
        />
      </SettingsCard>
      {isExportOpen && (
        <ExportDataDialog
          onClose={() => setIsExportOpen(false)}
        />
      )}
      {selectedImport && (
        <ImportDataDialog
          key={selectedImport.filePath}
          fileName={selectedImport.fileName}
          filePath={selectedImport.filePath}
          onClose={() => setSelectedImport(null)}
        />
      )}
    </>
  );
}
