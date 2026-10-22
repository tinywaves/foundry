import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinkIcon } from '@heroicons/react/24/outline';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useState } from 'react';
import type { CreateCaptureResult } from '../../../../shared/base';
import { baseKeys, createCapture } from '@renderer/base';
import { baseErrorKey } from '@renderer/base-error-key';
import { useI18n } from '@renderer/i18n/use-i18n';
import { useAppToast } from '@renderer/use-app-toast';

export function CaptureComposer({
  autoFocus = false,
  onCreated,
}: {
  autoFocus?: boolean;
  onCreated: (result: CreateCaptureResult) => void;
}) {
  const { t } = useI18n();
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: createCapture,
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          body: t(baseErrorKey(result.error.code)),
          type: 'error',
          uniqueID: `capture-error-${result.error.code}`,
        });
        return;
      }

      void queryClient.invalidateQueries({ queryKey: baseKeys.all });
      toast({
        body: t(result.data.created ? 'base.captureAdded' : 'base.captureExists'),
        uniqueID: result.data.created ? 'capture-added' : 'capture-exists',
      });
      setUrl('');
      setNote('');
      onCreated(result.data);
    },
  });

  const submit = () => {
    if (mutation.isPending) {
      return;
    }
    mutation.mutate({ url, userNote: note });
  };

  return (
    <Card width="100%" padding={4} elevation="low">
      <VStack gap={3}>
        <TextInput
          label={t('base.link')}
          isLabelHidden
          size="lg"
          value={url}
          onChange={setUrl}
          onEnter={submit}
          placeholder={t('base.linkPlaceholder')}
          startIcon={<Icon icon={LinkIcon} size="sm" />}
          hasAutoFocus={autoFocus}
          width="100%"
        />
        <TextArea
          label={t('base.note')}
          isLabelHidden
          size="sm"
          rows={2}
          value={note}
          onChange={setNote}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.key !== 'Enter' || event.shiftKey) {
              return;
            }

            event.preventDefault();
            submit();
          }}
          placeholder={t('base.notePlaceholder')}
          width="100%"
        />
        <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
          <Text type="supporting" color="secondary">
            {t('base.composerHint')}
          </Text>
          <Button
            label={t('base.capture')}
            size="sm"
            variant="primary"
            onClick={submit}
            isLoading={mutation.isPending}
            isDisabled={url.trim() === ''}
          />
        </HStack>
      </VStack>
    </Card>
  );
}
