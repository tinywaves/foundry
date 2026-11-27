import { Kbd } from '@/components/ui/kbd';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/workbench';
import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCaptureResult } from './types';
import { captureKeys, createCapture } from './api';
import { captureErrorKey, useI18n } from '../../i18n';
import { useAppToast } from '../../lib/api';

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
export function CaptureDialog({ isOpen, onOpenChange, onCreated }: {
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
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} width={620} padding={4} purpose="form" aria-label={t('captures.addCapture')}>
      <Card
        ref={dropZoneRef}
        role="button"
        tabIndex={0}
        aria-label={t('captures.pasteLink')}
        onClick={() => {
          dropZoneRef.current?.focus();
        }}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className="min-h-30 border border-dashed bg-muted cursor-text outline-none focus-visible:outline-2 focus-visible:outline-ring p-8"
      >
        <div className="min-h-20 flex flex-col items-center justify-center gap-4">
          {url
            ? (
                <>
                  <a href={url} target="_blank" rel="noreferrer" className="w-full justify-center text-center text-primary underline-offset-4 hover:underline break-all">
                    {url}
                  </a>
                  {mutation.isPending
                    ? <span className="text-xs text-muted-foreground">{t('captures.capturing')}</span>
                    : (
                        <div className="flex flex-row items-center justify-center gap-2">
                          <Kbd className="motion-safe:animate-pulse">Enter</Kbd>
                          <span className="text-xs text-muted-foreground">{t('captures.enterToCapture')}</span>
                        </div>
                      )}
                </>
              )
            : (
                <div className="flex flex-row flex-wrap items-center justify-center gap-2">
                  <Kbd>⌘ / Ctrl + V</Kbd>
                  <span className="text-xs text-muted-foreground">{t('captures.toPaste')}</span>
                </div>
              )}
        </div>
      </Card>
    </Modal>
  );
}
