import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@astryxdesign/core/Card';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Kbd } from '@astryxdesign/core/Kbd';
import { Link } from '@astryxdesign/core/Link';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import * as stylex from '@stylexjs/stylex';
import type { CreateCaptureResult } from './types';
import { captureKeys, createCapture } from './api';
import { captureErrorKey, useI18n } from '../../i18n';
import { useAppToast } from '../../lib/api';

const enterPulse = stylex.keyframes({
  '0%, 100%': {
    opacity: 1,
    transform: 'scale(1)',
  },
  '50%': {
    opacity: 0.65,
    transform: 'scale(1.08)',
  },
});

const styles = stylex.create({
  dropZone: {
    'minHeight': 'calc(var(--spacing-10) * 3)',
    'borderStyle': 'dashed',
    'borderWidth': 'var(--border-width)',
    'borderColor': 'var(--color-border-emphasized)',
    'backgroundColor': 'var(--color-background-muted)',
    'cursor': 'text',
    'outline': 'none',
    ':focus-visible': {
      outline: 'var(--border-width) solid var(--color-accent)',
      outlineOffset: 'var(--spacing-0-5)',
    },
  },
  content: {
    minHeight: 'calc(var(--spacing-10) * 2)',
  },
  urlLink: {
    justifyContent: 'center',
    width: '100%',
    textAlign: 'center',
  },
  enterKey: {
    animationName: enterPulse,
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
});

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
          body: t(captureErrorKey(result.error.code)),
          type: 'error',
          uniqueID: `capture-error-${result.error.code}`,
        });
        if (result.error.code === 'CAPTURE_ALREADY_EXISTS') {
          setUrl('');
        }
        dropZoneRef.current?.focus();
        return;
      }

      void queryClient.invalidateQueries({ queryKey: captureKeys.all });
      toast({
        body: t('captures.captureAdded'),
        uniqueID: 'capture-added',
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
        body: t('captures.invalidUrl'),
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
      aria-label={t('captures.addCapture')}
    >
      <Card
        ref={dropZoneRef}
        role="button"
        tabIndex={0}
        aria-label={t('captures.pasteLink')}
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
                    ? <Text type="supporting">{t('captures.capturing')}</Text>
                    : (
                        <HStack gap={2} vAlign="center" hAlign="center">
                          <Kbd keys="enter" xstyle={styles.enterKey} />
                          <Text type="supporting">{t('captures.enterToCapture')}</Text>
                        </HStack>
                      )}
                </>
              )
            : (
                <HStack gap={2} vAlign="center" hAlign="center" wrap="wrap">
                  <Kbd keys="mod+v" />
                  <Text type="supporting">{t('captures.toPaste')}</Text>
                </HStack>
              )}
        </VStack>
      </Card>
    </Dialog>
  );
}
