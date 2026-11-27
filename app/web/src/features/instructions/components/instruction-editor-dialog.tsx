import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateInstructionInput, Instruction } from '@dhzh/foundry-shared';
import {
  LoaderCircleIcon,
  PlusIcon,
  SaveIcon,
  XIcon,
} from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { RequiredLabel } from '@/components/required-label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { createInstruction, updateInstruction } from '../api';
import { instructionsQueryKey } from '../state/use-instructions';
import { LazyMarkdownEditor } from './lazy-markdown-editor';

const CONTENT_EDITOR_HEIGHT = '16rem';

interface InstructionEditorDialogProps {
  instruction?: Instruction;
  onClose: () => void;
}

export default function InstructionEditorDialog({
  instruction,
  onClose,
}: InstructionEditorDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const nameId = useId();
  const contentLabelId = useId();
  const isEditing = instruction !== undefined;
  const [name, setName] = useState(instruction?.name ?? '');
  const [content, setContent] = useState(instruction?.content ?? '');
  const mutation = useMutation({
    mutationFn: (input: CreateInstructionInput) => (
      instruction
        ? updateInstruction(instruction.id, input)
        : createInstruction(input)
    ),
    onSuccess: (saved) => {
      queryClient.setQueryData<Instruction[]>(
        instructionsQueryKey,
        (current) => [
          ...(current ?? []).filter((existing) => existing.id !== saved.id),
          saved,
        ].toSorted((left, right) =>
          right.updatedAt - left.updatedAt),
      );
      void queryClient.invalidateQueries({ queryKey: instructionsQueryKey });
      toast.success(t(isEditing ? 'instructions.updated' : 'instructions.created'));
      onClose();
    },
    onError: () => {
      toast.error(t(
        isEditing ? 'instructions.updateError' : 'instructions.error',
      ));
    },
  });
  const isPending = mutation.isPending;
  const canSubmit = Boolean(name.trim() && content.trim()) && !isPending;
  const titleKey = isEditing
    ? 'instructions.editTitle'
    : 'instructions.createTitle';
  const pendingLabel = isEditing
    ? 'instructions.updating'
    : 'instructions.creating';
  const idleLabel = isEditing
    ? 'instructions.updateSave'
    : 'instructions.save';
  const SubmitIcon = isEditing ? SaveIcon : PlusIcon;

  function close() {
    if (!isPending) {
      onClose();
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="
          grid max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]
          overflow-hidden
          sm:max-w-3xl
        "
      >
        <form
          className="contents"
          aria-busy={isPending}
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) {
              mutation.mutate({ name: name.trim(), content });
            }
          }}
        >
          <DialogHeader className="pr-8">
            <DialogTitle>{t(titleKey)}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            <div className="flex flex-col gap-2">
              <RequiredLabel htmlFor={nameId}>
                {t('instructions.name')}
              </RequiredLabel>
              <Input
                id={nameId}
                autoFocus
                required
                maxLength={200}
                value={name}
                disabled={isPending}
                placeholder={t('instructions.namePlaceholder')}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <RequiredLabel id={contentLabelId}>
                {t('instructions.content')}
              </RequiredLabel>
              <div
                role="group"
                aria-labelledby={contentLabelId}
                aria-required="true"
                className="
                  overflow-hidden rounded-md border border-input bg-input/20
                  focus-within:border-ring focus-within:ring-2
                  focus-within:ring-ring/30
                "
              >
                <LazyMarkdownEditor
                  height={CONTENT_EDITOR_HEIGHT}
                  value={content}
                  ariaLabel={t('instructions.content')}
                  placeholder={t('instructions.contentPlaceholder')}
                  readOnly={isPending}
                  onChange={setContent}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={close}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending
                ? <LoaderCircleIcon className="animate-spin" />
                : <SubmitIcon />}
              <span>
                {t(isPending ? pendingLabel : idleLabel)}
              </span>
            </Button>
          </DialogFooter>
        </form>
        <DialogClose
          disabled={isPending}
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
