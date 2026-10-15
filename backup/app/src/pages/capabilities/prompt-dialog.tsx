import type { CreatePromptRequest, Prompt } from '@dhzh/foundry-api-contract';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import {
  Cancel01Icon,
  Copy01Icon,
  FloppyDiskIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { SyntheticEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import { Skeleton } from '#/components/ui/skeleton';
import { Spinner } from '#/components/ui/spinner';
import { Textarea } from '#/components/ui/textarea';
import { toast } from '#/components/ui/toast';
import { useTheme } from '#/components/theme-provider';
import {
  useCreatePrompt,
  usePrompt,
  useUpdatePrompt,
} from '#/hooks/use-prompts';
import { copyPromptContent } from '#/pages/capabilities/prompt-copy';

interface PromptDraft {
  content: string;
  description: string;
  title: string;
}

interface PromptDialogProps {
  promptId: string | null;
  onClose: () => void;
}

const emptyDraft: PromptDraft = {
  content: '',
  description: '',
  title: '',
};

const editorExtensions = [
  markdown({ base: markdownLanguage }),
  EditorView.contentAttributes.of({ 'aria-label': 'Prompt content' }),
];

function toDraft(prompt: Prompt): PromptDraft {
  return {
    content: prompt.content,
    description: prompt.description ?? '',
    title: prompt.title,
  };
}

function snapshot(draft: PromptDraft): string {
  return JSON.stringify(draft);
}

function validateDraft(draft: PromptDraft): string | null {
  if (draft.title.trim() === '') {
    return 'Title is required.';
  }
  if (draft.title.trim().length > 100) {
    return 'Title must be no longer than 100 characters.';
  }
  if (draft.description.trim().length > 2000) {
    return 'Description must be no longer than 2,000 characters.';
  }
  if (draft.content.trim() === '') {
    return 'Content is required.';
  }
  if (new TextEncoder().encode(draft.content).byteLength > 1024 * 1024) {
    return 'Content must be no larger than 1 MiB.';
  }
  return null;
}

function PromptDialogForm({
  initialPrompt,
  onRequestCloseChange,
  onClose,
}: {
  initialPrompt?: Prompt;
  onRequestCloseChange: (handler: () => void) => void;
  onClose: () => void;
}) {
  const promptId = initialPrompt?.id ?? '';
  const { resolvedTheme } = useTheme();
  const promptCreation = useCreatePrompt();
  const promptUpdate = useUpdatePrompt(promptId);
  const [draft, setDraft] = useState(() => initialPrompt ? toDraft(initialPrompt) : emptyDraft);
  const [initialSnapshot] = useState(() => snapshot(
    initialPrompt ? toDraft(initialPrompt) : emptyDraft,
  ));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCloseRequested, setIsCloseRequested] = useState(false);
  const allowNavigationRef = useRef(false);
  const isEditing = initialPrompt !== undefined;
  const isDirty = snapshot(draft) !== initialSnapshot;
  const isPending = promptCreation.isPending
    || promptUpdate.isPending;
  const blocker = useBlocker(() => isDirty && !allowNavigationRef.current);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty || allowNavigationRef.current) {
        return;
      }
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const requestClose = useCallback(() => {
    if (isPending) {
      return;
    }
    if (isDirty) {
      setIsCloseRequested(true);
      return;
    }
    onClose();
  }, [isDirty, isPending, onClose]);

  useEffect(() => {
    onRequestCloseChange(requestClose);
    return () => onRequestCloseChange(onClose);
  }, [onClose, onRequestCloseChange, requestClose]);

  function keepEditing() {
    setIsCloseRequested(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }

  function discardChanges() {
    setIsCloseRequested(false);
    allowNavigationRef.current = true;
    if (blocker.state === 'blocked') {
      blocker.proceed();
      return;
    }
    onClose();
  }

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateDraft(draft);
    if (error) {
      setValidationError(error);
      return;
    }

    const input: CreatePromptRequest = {
      content: draft.content,
      description: draft.description.trim() || null,
      title: draft.title.trim(),
    };
    const mutation = isEditing ? promptUpdate : promptCreation;
    mutation.mutate(input, {
      onError: (mutationError) => setValidationError(mutationError.message),
      onSuccess: () => {
        allowNavigationRef.current = true;
        toast.add({
          title: isEditing ? 'Prompt saved' : 'Prompt created',
          type: 'success',
        });
        onClose();
      },
    });
  }

  return (
    <>
      <form
        className="flex h-[min(48rem,calc(100svh-2rem))] min-h-0 flex-col"
        onSubmit={submit}
      >
        {isEditing
          ? (
              <>
                <DialogTitle className="sr-only">Edit Prompt</DialogTitle>
                <DialogDescription className="sr-only">
                  View or update this saved fragment.
                </DialogDescription>
              </>
            )
          : (
              <DialogHeader className="shrink-0 border-b px-6 py-5 pe-14">
                <DialogTitle className="text-base font-semibold">New Prompt</DialogTitle>
                <DialogDescription>Save a reusable text fragment.</DialogDescription>
              </DialogHeader>
            )}
        <Button
          aria-label="Close Prompt editor"
          className="absolute top-3 inset-e-3"
          disabled={isPending}
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={requestClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
          {validationError && (
            <Alert className="mb-4" variant="destructive">
              <AlertTitle>Prompt could not be saved</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <FieldGroup className="min-h-0 flex-1 gap-4">
            <Field data-invalid={draft.title.trim().length > 100 || undefined}>
              <FieldLabel htmlFor="prompt-title" required>Title</FieldLabel>
              <Input
                id="prompt-title"
                maxLength={100}
                value={draft.title}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-description">Description</FieldLabel>
              <Textarea
                className="min-h-16 resize-none"
                id="prompt-description"
                maxLength={2000}
                value={draft.description}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))}
              />
            </Field>

            <Field className="min-h-64 flex-1">
              <FieldLabel required>Content</FieldLabel>
              <div className="min-h-64 flex-1 overflow-hidden rounded-md border">
                <CodeMirror
                  basicSetup={{
                    bracketMatching: true,
                    closeBrackets: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                    lineNumbers: true,
                  }}
                  className="h-full"
                  extensions={editorExtensions}
                  height="100%"
                  theme={resolvedTheme}
                  value={draft.content}
                  onChange={(content) => setDraft((current) => ({
                    ...current,
                    content,
                  }))}
                />
              </div>
            </Field>
          </FieldGroup>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t px-6 py-3">
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyPromptContent(draft.content)}
            >
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} data-icon="inline-start" />
              Copy
            </Button>
          )}
          <span className="flex-1" />
          <Button disabled={isPending} type="button" variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button disabled={isPending} type="submit">
            {isPending
              ? <Spinner data-icon="inline-start" />
              : <HugeiconsIcon icon={FloppyDiskIcon} strokeWidth={2} data-icon="inline-start" />}
            <span>Save</span>
          </Button>
        </div>
      </form>

      <AlertDialog
        open={isCloseRequested || blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open) {
            keepEditing();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Changes made in this Prompt have not been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={keepEditing}>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discardChanges}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PromptDialog({ promptId, onClose }: PromptDialogProps) {
  const promptQuery = usePrompt(promptId ?? '', promptId !== null);
  const requestCloseRef = useRef(onClose);
  const setRequestClose = useCallback((handler: () => void) => {
    requestCloseRef.current = handler;
  }, []);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          requestCloseRef.current();
        }
      }}
    >
      <DialogContent
        className="max-h-[calc(100svh-2rem)] overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton={false}
      >
        {promptId === null && (
          <PromptDialogForm
            onRequestCloseChange={setRequestClose}
            onClose={onClose}
          />
        )}

        {promptId !== null && promptQuery.isPending && (
          <div className="flex h-[min(48rem,calc(100svh-2rem))] min-h-0 flex-col">
            <DialogTitle className="sr-only">Edit Prompt</DialogTitle>
            <DialogDescription className="sr-only">Loading the saved fragment.</DialogDescription>
            <Button
              aria-label="Close Prompt editor"
              className="absolute top-3 inset-e-3"
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
            <div
              aria-label="Loading Prompt"
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-5"
              role="status"
            >
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-7 w-full" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="flex min-h-64 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="min-h-64 flex-1 w-full" />
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-3">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-16" />
            </div>
          </div>
        )}

        {promptId !== null && promptQuery.isError && (
          <div className="flex min-h-48 flex-col p-6">
            <DialogHeader>
              <DialogTitle>Prompt could not be loaded</DialogTitle>
              <DialogDescription>{promptQuery.error.message}</DialogDescription>
            </DialogHeader>
            <div className="mt-auto flex justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}

        {promptId !== null && promptQuery.data && (
          <PromptDialogForm
            initialPrompt={promptQuery.data}
            key={promptQuery.data.id}
            onRequestCloseChange={setRequestClose}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
