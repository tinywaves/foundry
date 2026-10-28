import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import * as stylex from '@stylexjs/stylex';
import type { CaptureSummary } from './types';
import { captureKeys, updateCaptureNote } from './api';
import { captureErrorKey, useI18n } from '../../i18n';
import { useAppToast } from '../../lib/api';

const styles = stylex.create({
  noteButton: {
    width: '100%',
    justifyContent: 'flex-start',
    textAlign: 'start',
  },
  noteInput: {
    minWidth: 0,
  },
});

export function NoteCell({ capture }: { capture: CaptureSummary }) {
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
    return (
      <TextInput
        label={t('captures.note')}
        isLabelHidden
        size="sm"
        value={draft}
        onChange={setDraft}
        onEnter={save}
        onBlur={save}
        hasAutoFocus
        isLoading={mutation.isPending}
        width="100%"
        containerXstyle={styles.noteInput}
      />
    );
  }

  return (
    <Button
      label={capture.userNote || t('captures.addNote')}
      variant="ghost"
      size="sm"
      xstyle={styles.noteButton}
      onClick={() => {
        setDraft(capture.userNote ?? '');
        setIsEditing(true);
      }}
    />
  );
}
