import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { Spinner } from '@astryxdesign/core/Spinner';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useMutation } from '@tanstack/react-query';
import {
  cancelImport,
  commitImport,
  exportData,
  inspectImport,
  restartApp,
} from '@renderer/apis/data-transfer';
import type { ImportPreview } from '../../../../../shared/data-transfer';
import { dataExportPassphraseMinimumLength } from '../../../../../shared/data-transfer';
import { useAppToast } from '@renderer/hooks/use-app-toast';
import { useI18n } from '@renderer/i18n/use-i18n';
import { dataTransferErrorKey } from '../data-transfer-error-key';

function PassphraseFields({
  passphrase,
  confirmation,
  onPassphraseChange,
  onConfirmationChange,
  onEnter,
  isDisabled,
}: {
  passphrase: string;
  confirmation: string;
  onPassphraseChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onEnter: () => void;
  isDisabled: boolean;
}) {
  const { t } = useI18n();
  return (
    <VStack gap={3}>
      <TextInput
        label={t('dataTransfer.passphrase')}
        description={t('dataTransfer.passphraseDescription')}
        type="password"
        size="sm"
        value={passphrase}
        onChange={onPassphraseChange}
        isDisabled={isDisabled}
        hasAutoFocus
        autoComplete="new-password"
      />
      <TextInput
        label={t('dataTransfer.confirmPassphrase')}
        type="password"
        size="sm"
        value={confirmation}
        onChange={onConfirmationChange}
        onEnter={onEnter}
        isDisabled={isDisabled}
        autoComplete="new-password"
      />
    </VStack>
  );
}

export function ExportDataDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useAppToast();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const mutation = useMutation({
    mutationFn: () => exportData(passphrase),
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          body: t(dataTransferErrorKey(result.error.code)),
          type: 'error',
          uniqueID: `data-transfer-export-${result.error.code}`,
        });
        return;
      }
      if (result.data.status === 'canceled') {
        return;
      }
      toast({
        body: t('dataTransfer.exported'),
        uniqueID: 'data-transfer-exported',
      });
      onClose();
    },
    onError: () => {
      toast({
        body: t('dataTransfer.ioError'),
        type: 'error',
        uniqueID: 'data-transfer-export-error',
      });
    },
  });

  const isTooShort = passphrase.length < dataExportPassphraseMinimumLength;
  const isMismatch = confirmation.length > 0 && passphrase !== confirmation;
  const submit = () => {
    if (isTooShort || passphrase !== confirmation || mutation.isPending) {
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) {
          onClose();
        }
      }}
      width={500}
      padding={0}
      purpose="form"
    >
      <Layout
        header={(
          <DialogHeader
            title={t('dataTransfer.exportTitle')}
            subtitle={t('dataTransfer.exportSubtitle')}
            onOpenChange={() => {
              if (!mutation.isPending) {
                onClose();
              }
            }}
          />
        )}
        content={(
          <LayoutContent>
            <VStack gap={4}>
              <PassphraseFields
                passphrase={passphrase}
                confirmation={confirmation}
                onPassphraseChange={setPassphrase}
                onConfirmationChange={setConfirmation}
                onEnter={submit}
                isDisabled={mutation.isPending}
              />
              {isTooShort && passphrase.length > 0 && (
                <Text type="supporting" color="secondary">
                  {t('dataTransfer.passphraseTooShort')}
                </Text>
              )}
              {isMismatch && (
                <Text type="supporting" color="secondary">
                  {t('dataTransfer.passphraseMismatch')}
                </Text>
              )}
              <Card padding={3} variant="muted">
                <Text type="supporting" color="secondary">
                  {t('dataTransfer.passphraseWarning')}
                </Text>
              </Card>
            </VStack>
          </LayoutContent>
        )}
        footer={(
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button
                label={t('dataTransfer.cancel')}
                variant="ghost"
                size="sm"
                isDisabled={mutation.isPending}
                onClick={onClose}
              />
              <Button
                label={t('dataTransfer.exportAction')}
                variant="primary"
                size="sm"
                isLoading={mutation.isPending}
                isDisabled={isTooShort || passphrase !== confirmation}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}

function PreviewRow({ label, value }: { label: string; value: string | number }) {
  return (
    <HStack gap={2}>
      <Text type="supporting" color="secondary">{label}</Text>
      <Text type="label">{String(value)}</Text>
    </HStack>
  );
}

export function ImportDataDialog({
  fileName,
  filePath,
  onClose,
}: {
  fileName: string;
  filePath: string;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const toast = useAppToast();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [step, setStep] = useState<'passphrase' | 'preview' | 'importing' | 'complete'>('passphrase');
  const [isRestarting, setIsRestarting] = useState(false);

  const inspectMutation = useMutation({
    mutationFn: () => inspectImport(filePath, passphrase),
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          body: t(dataTransferErrorKey(result.error.code)),
          type: 'error',
          uniqueID: `data-transfer-import-${result.error.code}`,
        });
        return;
      }
      setPreview(result.data);
      setPassphrase('');
      setStep('preview');
    },
    onError: () => {
      toast({
        body: t('dataTransfer.ioError'),
        type: 'error',
        uniqueID: 'data-transfer-inspect-error',
      });
    },
  });

  const commitMutation = useMutation({
    mutationFn: (importId: string) => commitImport(importId),
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          body: t(dataTransferErrorKey(result.error.code)),
          type: 'error',
          uniqueID: `data-transfer-commit-${result.error.code}`,
        });
        setStep('preview');
        return;
      }
      setStep('complete');
    },
    onError: () => {
      toast({
        body: t('dataTransfer.ioError'),
        type: 'error',
        uniqueID: 'data-transfer-commit-error',
      });
      setStep('preview');
    },
  });

  const isPassphraseReady = passphrase.length >= dataExportPassphraseMinimumLength
    && passphrase === confirmation;
  const isBlocking = step === 'importing' || step === 'complete';
  const close = () => {
    if (isBlocking || commitMutation.isPending) {
      return;
    }
    if (preview) {
      void cancelImport(preview.importId);
    }
    onClose();
  };
  const inspect = () => {
    if (!isPassphraseReady || inspectMutation.isPending) {
      return;
    }
    inspectMutation.mutate();
  };
  const commit = () => {
    if (!preview || commitMutation.isPending) {
      return;
    }
    setStep('importing');
    commitMutation.mutate(preview.importId);
  };
  const restart = async () => {
    setIsRestarting(true);
    try {
      await restartApp();
    } catch {
      setIsRestarting(false);
    }
  };

  const title = (() => {
    switch (step) {
      case 'passphrase': {
        return t('dataTransfer.importTitle');
      }
      case 'preview': {
        return t('dataTransfer.previewTitle');
      }
      case 'importing': {
        return t('dataTransfer.importingTitle');
      }
      case 'complete': {
        return t('dataTransfer.restartTitle');
      }
    }
  })();

  const exportedAt = preview
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(preview.exportedAt))
    : '';

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
        }
      }}
      width={520}
      padding={0}
      purpose={isBlocking ? 'required' : 'form'}
    >
      <Layout
        header={(
          <DialogHeader
            title={title}
            subtitle={fileName}
            onOpenChange={isBlocking ? undefined : close}
          />
        )}
        content={(
          <LayoutContent>
            {step === 'passphrase' && (
              <VStack gap={4}>
                <PassphraseFields
                  passphrase={passphrase}
                  confirmation={confirmation}
                  onPassphraseChange={setPassphrase}
                  onConfirmationChange={setConfirmation}
                  onEnter={inspect}
                  isDisabled={inspectMutation.isPending}
                />
                {confirmation.length > 0 && passphrase !== confirmation && (
                  <Text type="supporting" color="secondary">
                    {t('dataTransfer.passphraseMismatch')}
                  </Text>
                )}
                <Card padding={3} variant="muted">
                  <Text type="supporting" color="secondary">
                    {t('dataTransfer.importPassphraseDescription')}
                  </Text>
                </Card>
              </VStack>
            )}
            {step === 'preview' && preview && (
              <VStack gap={4}>
                <Card padding={3} variant="muted">
                  <VStack gap={2}>
                    <PreviewRow label={t('dataTransfer.exportedAt')} value={exportedAt} />
                    <PreviewRow label={t('dataTransfer.appVersion')} value={preview.appVersion} />
                    <PreviewRow label={t('dataTransfer.schemaVersion')} value={preview.databaseSchemaVersion} />
                    <PreviewRow label={t('dataTransfer.providers')} value={preview.providerCount} />
                    <PreviewRow label={t('dataTransfer.captures')} value={preview.captureCount} />
                    <PreviewRow label={t('dataTransfer.jobs')} value={preview.jobCount} />
                  </VStack>
                </Card>
                <Text type="supporting" color="secondary">
                  {t('dataTransfer.replaceWarning')}
                </Text>
              </VStack>
            )}
            {step === 'importing' && (
              <VStack hAlign="center" vAlign="center" gap={4} paddingBlock={8}>
                <Spinner size="lg" label={t('dataTransfer.importingDescription')} />
                <Text type="supporting" color="secondary">
                  {t('dataTransfer.importingHint')}
                </Text>
              </VStack>
            )}
            {step === 'complete' && (
              <VStack gap={3}>
                <Text>{t('dataTransfer.restartDescription')}</Text>
                <Text type="supporting" color="secondary">
                  {t('dataTransfer.restartHint')}
                </Text>
              </VStack>
            )}
          </LayoutContent>
        )}
        footer={(
          <LayoutFooter>
            {step === 'passphrase' && (
              <HStack gap={2} hAlign="end">
                <Button
                  label={t('dataTransfer.cancel')}
                  variant="ghost"
                  size="sm"
                  isDisabled={inspectMutation.isPending}
                  onClick={close}
                />
                <Button
                  label={t('dataTransfer.inspectAction')}
                  variant="primary"
                  size="sm"
                  isLoading={inspectMutation.isPending}
                  isDisabled={!isPassphraseReady}
                  onClick={inspect}
                />
              </HStack>
            )}
            {step === 'preview' && (
              <HStack gap={2} hAlign="end">
                <Button
                  label={t('dataTransfer.cancel')}
                  variant="ghost"
                  size="sm"
                  onClick={close}
                />
                <Button
                  label={t('dataTransfer.importAction')}
                  variant="destructive"
                  size="sm"
                  isLoading={commitMutation.isPending}
                  onClick={commit}
                />
              </HStack>
            )}
            {step === 'complete' && (
              <HStack gap={2} hAlign="end">
                <Button
                  label={t('dataTransfer.restartAction')}
                  variant="primary"
                  size="sm"
                  isLoading={isRestarting}
                  onClick={() => {
                    void restart();
                  }}
                />
              </HStack>
            )}
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}
