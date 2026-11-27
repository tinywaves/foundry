import { useMutation } from '@tanstack/react-query';
import { FileOutputIcon, LoaderCircleIcon, LockKeyholeIcon, XIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PasswordInput } from '@/components/password-input';
import { RequiredLabel } from '@/components/required-label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { exportData } from './api';

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const passphraseId = useId();
  const confirmationId = useId();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const mutation = useMutation({
    mutationFn: exportData,
    onSuccess: () => {
      toast.success(t('dataExport.exported'));
      onClose();
    },
    onError: () => {
      toast.error(t('dataExport.error'));
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) {
          onClose();
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <form
          className="flex flex-col gap-4"
          aria-busy={mutation.isPending}
          onSubmit={(event) => {
            event.preventDefault();
            if (!passphrase || !confirmation || mutation.isPending) {
              return;
            }
            if (passphrase !== confirmation) {
              toast.error(t('dataExport.passphraseMismatch'));
              return;
            }
            mutation.mutate({ passphrase });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('dataExport.title')}</DialogTitle>
            <DialogDescription>{t('dataExport.description')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <RequiredLabel htmlFor={passphraseId}>
              {t('dataExport.passphrase')}
            </RequiredLabel>
            <PasswordInput
              id={passphraseId}
              autoComplete="new-password"
              required
              value={passphrase}
              disabled={mutation.isPending}
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <RequiredLabel htmlFor={confirmationId}>
              {t('dataExport.confirmPassphrase')}
            </RequiredLabel>
            <PasswordInput
              id={confirmationId}
              autoComplete="new-password"
              required
              value={confirmation}
              disabled={mutation.isPending}
              aria-invalid={confirmation.length > 0 && passphrase !== confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <LockKeyholeIcon className="size-4 shrink-0" />
            <span>{t('dataExport.passphraseHint')}</span>
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={mutation.isPending} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!passphrase || !confirmation || mutation.isPending}>
              {mutation.isPending ? <LoaderCircleIcon className="animate-spin" /> : <FileOutputIcon />}
              <span>{t(mutation.isPending ? 'dataExport.exporting' : 'dataExport.action')}</span>
            </Button>
          </DialogFooter>
        </form>
        <DialogClose
          disabled={mutation.isPending}
          render={(
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
            />
          )}
        >
          <XIcon />
          <span className="sr-only">{t('a11y.close')}</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
