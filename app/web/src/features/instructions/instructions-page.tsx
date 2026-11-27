import { PlusIcon } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeaderActions } from '@/app/page-header-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const CreateInstructionDialog = lazy(
  () => import('./components/create-instruction-dialog'),
);

export function InstructionsPage() {
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <PageHeaderActions>
        <Button
          type="button"
          onClick={() => {
            setIsCreateOpen(true);
          }}
        >
          <PlusIcon />
          <span>{t('instructions.create')}</span>
        </Button>
      </PageHeaderActions>
      {isCreateOpen && (
        <Suspense fallback={<CreateInstructionDialogFallback />}>
          <CreateInstructionDialog
            onClose={() => {
              setIsCreateOpen(false);
            }}
          />
        </Suspense>
      )}
    </>
  );
}

function CreateInstructionDialogFallback() {
  const { t } = useTranslation();

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('instructions.createTitle')}</DialogTitle>
        </DialogHeader>
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-72 w-full" />
      </DialogContent>
    </Dialog>
  );
}
