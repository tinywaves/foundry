import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/workbench';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CaptureSummary } from './types';
import { captureKeys, updateCaptureNote } from './api';
import { captureErrorKey, useI18n } from '../../i18n';
import { useAppToast } from '../../lib/api';

export function NoteCell({ capture }: {
  capture: CaptureSummary;
}) {
  const { t } = useI18n();
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(capture.userNote ?? '');
  const mutation = useMutation({
    mutationFn: (value: string) => updateCaptureNote(capture.id, value),
    onSuccess: (result) => {
      if (!result.ok) {
        toast({ body: t(captureErrorKey(result.error.code)), type: 'error' });
        return;
      }
      setDraft(result.data.userNote ?? '');
      setIsEditing(false);
      void queryClient.invalidateQueries({ queryKey: captureKeys.all });
    },
  });
  if (isEditing) {
    const save = () => {
      if (mutation.isPending || draft === (capture.userNote ?? '')) {
        setIsEditing(false);
        return;
      }
      mutation.mutate(draft);
    };
    return (<FormInput label={t('captures.note')} isLabelHidden size="sm" value={draft} onChange={setDraft} onEnter={save} onBlur={save} hasAutoFocus isLoading={mutation.isPending} width="100%" className="min-w-0" />);
  }
  return (
    <Button
      onClick={() => {
        setDraft(capture.userNote ?? '');
        setIsEditing(true);
      }}
      variant="ghost"
      size="sm"
      className="w-full justify-start text-start"
    >
      {capture.userNote || t('captures.addNote')}
    </Button>
  );
}
