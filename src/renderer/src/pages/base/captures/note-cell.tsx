import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import type { CaptureSummary } from '../../../../../shared/base';
import { baseKeys, updateCaptureNote } from '@renderer/apis/base';
import { baseErrorKey } from '@renderer/pages/base/base-error-key';
import { useI18n } from '@renderer/i18n/use-i18n';
import { useAppToast } from '@renderer/hooks/use-app-toast';
import { styles } from './styles';

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
        toast({ body: t(baseErrorKey(result.error.code)), type: 'error' });
        return;
      }
      setDraft(result.data.userNote ?? '');
      setIsEditing(false);
      void queryClient.invalidateQueries({ queryKey: baseKeys.all });
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
        label={t('base.note')}
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
      label={capture.userNote || t('base.addNote')}
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
