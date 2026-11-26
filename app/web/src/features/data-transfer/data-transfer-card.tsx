import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormInput, Modal, PanelLayout, ModalHeader, ContentPane, IconGlyph, Footer } from '@/components/workbench';
import { useState } from 'react';
import { LockKeyhole as LockClosedIcon } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { cancelImport, commitImport, exportData, inspectImport, restartApp } from './api';
import type { ImportPreview } from './types';
import { useAppToast } from '../../lib/api';
import { useI18n, dataTransferErrorKey } from '../../i18n';

function PassphraseFields({ passphrase, confirmation, onPassphraseChange, onConfirmationChange, onEnter, isDisabled }: {
  passphrase: string;
  confirmation: string;
  onPassphraseChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onEnter: () => void;
  isDisabled: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <FormInput label={t('dataTransfer.passphrase')} description={t('dataTransfer.passphraseDescription')} type="password" size="sm" width="100%" value={passphrase} onChange={onPassphraseChange} isDisabled={isDisabled} isRequired hasAutoFocus autoComplete="new-password" />
      <FormInput
        label={t('dataTransfer.confirmPassphrase')}
        type="password"
        size="sm"
        width="100%"
        value={confirmation}
        onChange={onConfirmationChange}
        onEnter={onEnter}
        isDisabled={isDisabled}
        isRequired
        status={passphrase !== confirmation && confirmation.length > 0
          ? { type: 'error', message: t('dataTransfer.passphraseMismatch') }
          : undefined}
        autoComplete="new-password"
      />
    </div>
  );
}
export function ExportDataDialog({ onClose }: {
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
  const submit = () => {
    if (passphrase !== confirmation || passphrase.length === 0 || mutation.isPending) {
      return;
    }
    mutation.mutate();
  };
  return (
    <Modal
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) {
          onClose();
        }
      }}
      width={560}
      padding={5}
      purpose="form"
    >
      <PanelLayout
        header={(
          <ModalHeader
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
          <ContentPane>
            <div className="flex flex-col gap-5">
              <PassphraseFields passphrase={passphrase} confirmation={confirmation} onPassphraseChange={setPassphrase} onConfirmationChange={setConfirmation} onEnter={submit} isDisabled={mutation.isPending} />
              <Card className="p-2">
                <div className="flex flex-row items-start gap-2">
                  <IconGlyph icon={LockClosedIcon} className="size-4 shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {t('dataTransfer.passphraseWarning')}
                  </span>
                </div>
              </Card>
            </div>
          </ContentPane>
        )}
        footer={(
          <Footer>
            <div className="max-[480px]:flex-col-reverse max-[480px]:items-stretch max-[480px]:[&>button]:w-full max-[480px]:[&>button]:min-h-11 flex flex-row justify-end gap-2">
              <Button onClick={onClose} variant="ghost" size="sm" disabled={mutation.isPending}>
                <span>{t('dataTransfer.cancel')}</span>
              </Button>
              <Button onClick={submit} variant="default" size="sm" disabled={passphrase !== confirmation || passphrase.length === 0 || mutation.isPending}>
                {mutation.isPending && <Spinner />}
                <span>{t('dataTransfer.exportAction')}</span>
              </Button>
            </div>
          </Footer>
        )}
      />
    </Modal>
  );
}
function PreviewRow({ label, value }: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-row gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{String(value)}</span>
    </div>
  );
}
export function ImportDataDialog({ file, fileName, onClose }: {
  file: File;
  fileName: string;
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
    mutationFn: () => inspectImport(file, passphrase),
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
  const isPassphraseReady = passphrase === confirmation
    && passphrase.length > 0;
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
  const restart = () => {
    setIsRestarting(true);
    try {
      restartApp();
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
    <Modal
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
        }
      }}
      width={520}
      padding={5}
      purpose={isBlocking ? 'required' : 'form'}
    >
      <PanelLayout
        header={(<ModalHeader title={title} subtitle={fileName} onOpenChange={isBlocking ? undefined : close} />)}
        content={(
          <ContentPane>
            {step === 'passphrase' && (
              <div className="flex flex-col gap-4">
                <PassphraseFields passphrase={passphrase} confirmation={confirmation} onPassphraseChange={setPassphrase} onConfirmationChange={setConfirmation} onEnter={inspect} isDisabled={inspectMutation.isPending} />
                <Card className="p-3">
                  <span className="text-xs text-muted-foreground">
                    {t('dataTransfer.importPassphraseDescription')}
                  </span>
                </Card>
              </div>
            )}
            {step === 'preview' && preview && (
              <div className="flex flex-col gap-4">
                <Card className="p-3">
                  <div className="flex flex-col gap-2">
                    <PreviewRow label={t('dataTransfer.exportedAt')} value={exportedAt} />
                    <PreviewRow label={t('dataTransfer.appVersion')} value={preview.appVersion} />
                    <PreviewRow label={t('dataTransfer.schemaVersion')} value={preview.dataFormatVersion} />
                    <PreviewRow label={t('dataTransfer.providers')} value={preview.providerCount} />
                    <PreviewRow label={t('dataTransfer.captures')} value={preview.captureCount} />
                    <PreviewRow label={t('dataTransfer.jobs')} value={preview.jobCount} />
                  </div>
                </Card>
                <span className="text-xs text-muted-foreground">
                  {t('dataTransfer.replaceWarning')}
                </span>
              </div>
            )}
            {step === 'importing' && (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <Spinner aria-label={t('dataTransfer.importingDescription')} />
                <span className="text-xs text-muted-foreground">
                  {t('dataTransfer.importingHint')}
                </span>
              </div>
            )}
            {step === 'complete' && (
              <div className="flex flex-col gap-3">
                <span>{t('dataTransfer.restartDescription')}</span>
                <span className="text-xs text-muted-foreground">
                  {t('dataTransfer.restartHint')}
                </span>
              </div>
            )}
          </ContentPane>
        )}
        footer={(
          <Footer>
            {step === 'passphrase' && (
              <div className="max-[480px]:flex-col-reverse max-[480px]:items-stretch max-[480px]:[&>button]:w-full max-[480px]:[&>button]:min-h-11 flex flex-row justify-end gap-2">
                <Button onClick={close} variant="ghost" size="sm" disabled={inspectMutation.isPending}>
                  <span>{t('dataTransfer.cancel')}</span>
                </Button>
                <Button onClick={inspect} variant="default" size="sm" disabled={!isPassphraseReady || inspectMutation.isPending}>
                  {inspectMutation.isPending && <Spinner />}
                  <span>{t('dataTransfer.inspectAction')}</span>
                </Button>
              </div>
            )}
            {step === 'preview' && (
              <div className="max-[480px]:flex-col-reverse max-[480px]:items-stretch max-[480px]:[&>button]:w-full max-[480px]:[&>button]:min-h-11 flex flex-row justify-end gap-2">
                <Button onClick={close} variant="ghost" size="sm">
                  <span>{t('dataTransfer.cancel')}</span>
                </Button>
                <Button onClick={commit} variant="destructive" size="sm" disabled={commitMutation.isPending}>
                  {commitMutation.isPending && <Spinner />}
                  <span>{t('dataTransfer.importAction')}</span>
                </Button>
              </div>
            )}
            {step === 'complete' && (
              <div className="max-[480px]:flex-col-reverse max-[480px]:items-stretch max-[480px]:[&>button]:w-full max-[480px]:[&>button]:min-h-11 flex flex-row justify-end gap-2">
                <Button onClick={restart} variant="default" size="sm" disabled={isRestarting}>
                  {isRestarting && <Spinner />}
                  <span>{t('dataTransfer.restartAction')}</span>
                </Button>
              </div>
            )}
          </Footer>
        )}
      />
    </Modal>
  );
}
