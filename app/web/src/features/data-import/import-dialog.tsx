import { useMutation } from '@tanstack/react-query';
import { FileInputIcon, LoaderCircleIcon, XIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { importData, ImportRequestError } from './api';

import type { TranslationKey } from '@/i18n/resources';

export function ImportDialog({ file, onClose }: { file: File; onClose: () => void }) {
  const { t } = useTranslation();
  const passphraseId = useId();
  const [passphrase, setPassphrase] = useState('');
  const mutation = useMutation({
    mutationFn: () => importData(file, passphrase),
    onSuccess: () => {
      location.replace(`${location.pathname}${location.search}`);
    },
    onError: (error) => toast.error(t(errorKey(error))),
  });
  const isPending = mutation.isPending || mutation.isSuccess;
  const close = () => {
    if (!isPending) {
      onClose();
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <form
          className="flex flex-col gap-4"
          aria-busy={isPending}
          onSubmit={(event) => {
            event.preventDefault();
            if (isPending) {
              return;
            }
            if (passphrase) {
              mutation.mutate();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('dataImport.title')}</DialogTitle>
            <DialogDescription className="break-all">{file.name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={passphraseId}>{t('dataImport.passphrase')}</Label>
            <PasswordInput
              id={passphraseId}
              autoComplete="current-password"
              required
              value={passphrase}
              disabled={isPending}
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t('dataImport.replaceWarning')}</p>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={isPending} onClick={close}>{t('common.cancel')}</Button>
            <Button type="submit" variant="destructive" disabled={isPending || !passphrase}>
              {isPending ? <LoaderCircleIcon className="animate-spin" /> : <FileInputIcon />}
              <span>{t('dataImport.replaceAction')}</span>
            </Button>
          </DialogFooter>
        </form>
        <Button type="button" disabled={isPending} onClick={close} variant="ghost" size="icon-sm" className="absolute top-2 right-2">
          <XIcon />
          <span className="sr-only">{t('a11y.close')}</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function errorKey(error: unknown): TranslationKey {
  if (error instanceof ImportRequestError) {
    switch (error.code) {
      case 'INVALID_BACKUP': { return 'dataImport.invalidBackup'; }
      case 'INVALID_PASSPHRASE': { return 'dataImport.invalidPassphrase'; }
    }
  }
  return 'dataImport.error';
}
