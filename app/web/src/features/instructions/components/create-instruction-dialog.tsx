import Editor from '@monaco-editor/react';
import { useMutation } from '@tanstack/react-query';
import type { CreateInstructionInput } from '@dhzh/foundry-shared';
import { LoaderCircleIcon, PlusIcon, XIcon } from 'lucide-react';
import type { editor } from 'monaco-editor';
import {
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
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
import '@/lib/monaco';

import { createInstruction } from '../api';

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}

function isDarkTheme() {
  return document.documentElement.classList.contains('dark');
}

export default function CreateInstructionDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const isDark = useSyncExternalStore(subscribeTheme, isDarkTheme);
  const nameId = useId();
  const contentLabelId = useId();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const mutation = useMutation({
    mutationFn: (input: CreateInstructionInput) => createInstruction(input),
    onSuccess: () => {
      toast.success(t('instructions.created'));
      onClose();
    },
    onError: () => {
      toast.error(t('instructions.error'));
    },
  });
  const isPending = mutation.isPending;
  const editorOptions = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      ariaLabel: t('instructions.content'),
      automaticLayout: true,
      contextmenu: true,
      folding: false,
      glyphMargin: false,
      lineDecorationsWidth: 12,
      lineNumbers: 'off',
      minimap: { enabled: false },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      padding: { top: 12, bottom: 12 },
      placeholder: t('instructions.contentPlaceholder'),
      readOnly: isPending,
      renderLineHighlight: 'none',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'none',
    }),
    [isPending, t],
  );
  const canSubmit = Boolean(name.trim() && content.trim()) && !isPending;
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
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-3xl"
      >
        <form
          className="flex flex-col gap-4"
          aria-busy={isPending}
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) {
              mutation.mutate({ name: name.trim(), content });
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('instructions.createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <RequiredLabel htmlFor={nameId}>{t('instructions.name')}</RequiredLabel>
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
              <Editor
                height="16rem"
                language="markdown"
                theme={isDark ? 'vs-dark' : 'vs'}
                value={content}
                options={editorOptions}
                loading={(
                  <div className="text-xs text-muted-foreground">
                    {t('instructions.editorLoading')}
                  </div>
                )}
                onChange={(markdown = '') => {
                  setContent(markdown);
                }}
              />
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
                : <PlusIcon />}
              <span>
                {t(isPending ? 'instructions.creating' : 'instructions.save')}
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
