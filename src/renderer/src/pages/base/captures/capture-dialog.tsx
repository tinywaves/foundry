import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@astryxdesign/core/Card';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Kbd } from '@astryxdesign/core/Kbd';
import { Link } from '@astryxdesign/core/Link';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import type { CreateCaptureResult } from '../../../../../shared/base';
import { baseKeys, createCapture } from '@renderer/base';
import { baseErrorKey } from '@renderer/base-error-key';
import { useI18n } from '@renderer/i18n/use-i18n';
import { useAppToast } from '@renderer/use-app-toast';
import { styles } from './capture-dialog-styles';

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function CaptureDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreated: (result: CreateCaptureResult) => void;
}) {
  const { t } = useI18n();
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');

  const mutation = useMutation({
    mutationFn: createCapture,
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          body: t(baseErrorKey(result.error.code)),
          type: 'error',
          uniqueID: `capture-error-${result.error.code}`,
        });
        dropZoneRef.current?.focus();
        return;
      }

      void queryClient.invalidateQueries({ queryKey: baseKeys.all });
      toast({
        body: t(result.data.created ? 'base.captureAdded' : 'base.captureExists'),
        uniqueID: result.data.created ? 'capture-added' : 'capture-exists',
      });
      onCreated(result.data);
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect
    setUrl('');
    requestAnimationFrame(() => {
      dropZoneRef.current?.focus();
    });
  }, [isOpen]);

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const pasted = event.clipboardData.getData('text/plain').trim();
    event.preventDefault();
    if (!pasted) {
      return;
    }
    setUrl(pasted);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || mutation.isPending) {
      return;
    }
    event.preventDefault();
    if (!url) {
      return;
    }
    if (!isValidHttpUrl(url)) {
      toast({
        body: t('base.invalidUrl'),
        type: 'error',
        uniqueID: 'invalid-capture-url',
      });
      return;
    }
    mutation.mutate({ url });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={620}
      padding={4}
      purpose="form"
      aria-label={t('base.addCapture')}
    >
      <Card
        ref={dropZoneRef}
        role="button"
        tabIndex={0}
        aria-label={t('base.pasteLink')}
        padding={8}
        variant="transparent"
        xstyle={styles.dropZone}
        onClick={() => {
          dropZoneRef.current?.focus();
        }}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
      >
        <VStack hAlign="center" vAlign="center" gap={4} xstyle={styles.content}>
          {url
            ? (
                <>
                  <Link
                    href={url}
                    isStandalone
                    size="lg"
                    display="block"
                    weight="semibold"
                    maxLines={3}
                    target="_blank"
                    xstyle={styles.urlLink}
                  >
                    {url}
                  </Link>
                  {mutation.isPending
                    ? <Text type="supporting">{t('base.capturing')}</Text>
                    : (
                        <HStack gap={2} vAlign="center" hAlign="center">
                          <Kbd keys="enter" xstyle={styles.enterKey} />
                          <Text type="supporting">{t('base.enterToCapture')}</Text>
                        </HStack>
                      )}
                </>
              )
            : (
                <HStack gap={2} vAlign="center" hAlign="center" wrap="wrap">
                  <Kbd keys="mod+v" />
                  <Text type="supporting">{t('base.toPaste')}</Text>
                </HStack>
              )}
        </VStack>
      </Card>
    </Dialog>
  );
}
