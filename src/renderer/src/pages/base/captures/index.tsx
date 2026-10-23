import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  QueueListIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@astryxdesign/core/Button';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Link } from '@astryxdesign/core/Link';
import { Popover } from '@astryxdesign/core/Popover';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {
  Table,
  pixel,
  proportional,
} from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import type { CaptureFilter, CaptureSummary } from '../../../../../shared/base';
import {
  baseKeys,
  deleteCapture,
  listCaptures,
  recapture,
  subscribeToScrapeJobFinished,
} from '@renderer/apis/base';
import { baseErrorKey } from '@renderer/pages/base/base-error-key';
import { useI18n } from '@renderer/i18n/use-i18n';
import { useAppToast } from '@renderer/hooks/use-app-toast';
import { CaptureDialog } from './capture-dialog';
import { CapturesEmptyState } from './empty-state';
import { NoteCell } from './note-cell';
import { styles } from './styles';

export default function CapturesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [filter, setFilter] = useState<CaptureFilter>('all');
  const [titlebarActions, setTitlebarActions] = useState<HTMLElement | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [captureToDelete, setCaptureToDelete] = useState<CaptureSummary | null>(null);

  const capturesQuery = useQuery({
    queryKey: baseKeys.captures(filter),
    queryFn: () => listCaptures(filter),
  });
  const recaptureMutation = useMutation({
    mutationFn: recapture,
    onSuccess: (result) => {
      toast(result.ok
        ? {
            body: t('base.recaptureStarted'),
            uniqueID: 'recapture-started',
          }
        : {
            body: t(baseErrorKey(result.error.code)),
            type: 'error',
            uniqueID: result.error.code,
          });
    },
  });
  const captureRemoval = useMutation({
    mutationFn: deleteCapture,
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          body: t(baseErrorKey(result.error.code)),
          type: 'error',
          uniqueID: result.error.code,
        });
        setCaptureToDelete(null);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: baseKeys.all });
      toast({
        body: t('base.captureDeleted'),
        uniqueID: 'capture-deleted',
      });
      setCaptureToDelete(null);
    },
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect
    setTitlebarActions(document.getElementById('window-titlebar-actions'));
  }, []);

  useEffect(() => subscribeToScrapeJobFinished((event) => {
    if (event.status === 'succeeded') {
      void queryClient.invalidateQueries({ queryKey: baseKeys.all });
      return;
    }
    toast({
      body: t('base.scrapeFailed'),
      type: 'error',
      uniqueID: `scrape-failed-${event.jobId}`,
    });
  }), [queryClient, t, toast]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: baseKeys.captures(filter) });
  };

  const columns = useMemo<Array<TableColumn<CaptureSummary>>>(() => [
    {
      key: 'url',
      header: t('base.url'),
      width: proportional(3),
      renderCell: (capture) => (
        <Link
          href={capture.url}
          isStandalone
          display="block"
          maxLines={1}
          target="_blank"
          tooltip={capture.url}
          xstyle={styles.urlLink}
        >
          {capture.url}
        </Link>
      ),
    },
    {
      key: 'title',
      header: t('base.title'),
      width: proportional(2),
      renderCell: (capture) => (
        <Text maxLines={1}>{capture.title ?? ''}</Text>
      ),
    },
    {
      key: 'note',
      header: t('base.note'),
      width: proportional(2),
      renderCell: (capture) => <NoteCell capture={capture} />,
    },
    {
      key: 'updatedAt',
      header: t('base.updatedAt'),
      width: pixel(160),
      renderCell: (capture) => (
        <Text color="secondary">{capture.updatedAt}</Text>
      ),
    },
    {
      key: 'createdAt',
      header: t('base.createdAt'),
      width: pixel(160),
      renderCell: (capture) => (
        <Text color="secondary">{capture.createdAt}</Text>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: pixel(144),
      align: 'end',
      renderCell: (capture) => (
        <HStack gap={1} hAlign="end">
          <IconButton
            label={t('base.viewJobs')}
            tooltip={t('base.viewJobs')}
            icon={<QueueListIcon />}
            size="sm"
            variant="ghost"
            onClick={() => {
              void navigate(`/base/captures/${capture.id}/jobs`);
            }}
          />
          <IconButton
            label={t('base.recapture')}
            tooltip={t('base.recapture')}
            icon={<ArrowPathIcon />}
            size="sm"
            variant="ghost"
            onClick={() => {
              recaptureMutation.mutate(capture.id);
            }}
          />
          <Popover
            label={`${t('base.delete')} ${capture.url}`}
            isOpen={captureToDelete?.id === capture.id}
            onOpenChange={(isOpen) => {
              setCaptureToDelete(isOpen ? capture : null);
            }}
            content={(
              <VStack gap={3}>
                <Text type="label">{t('base.deleteCaptureTitle')}</Text>
                <HStack gap={2} hAlign="end">
                  <Button
                    label={t('base.cancel')}
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCaptureToDelete(null);
                    }}
                  />
                  <Button
                    label={t('base.delete')}
                    size="sm"
                    variant="destructive"
                    isLoading={captureRemoval.isPending && captureToDelete?.id === capture.id}
                    onClick={() => {
                      captureRemoval.mutate(capture.id);
                    }}
                  />
                </HStack>
              </VStack>
            )}
          >
            <IconButton
              label={t('base.delete')}
              tooltip={t('base.delete')}
              icon={<TrashIcon />}
              size="sm"
              variant="ghost"
            />
          </Popover>
        </HStack>
      ),
    },
  ], [captureRemoval, captureToDelete, navigate, recaptureMutation, t]);

  const captures = capturesQuery.data ?? [];

  return (
    <>
      {titlebarActions && createPortal(
        <Button
          label={t('base.addCapture')}
          size="sm"
          variant="primary"
          onClick={() => {
            setIsComposerOpen(true);
          }}
        />,
        titlebarActions,
      )}
      <VStack gap={5}>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <SegmentedControl
            label={t('base.captureFilter')}
            size="sm"
            value={filter}
            onChange={(value) => {
              setFilter(value as CaptureFilter);
            }}
          >
            <SegmentedControlItem value="all" label={t('base.allCaptures')} />
            <SegmentedControlItem value="no-successful" label={t('base.noCapturedContent')} />
          </SegmentedControl>
          <StackItem size="fill" />
          <IconButton
            label={t('base.refresh')}
            tooltip={t('base.refresh')}
            icon={<ArrowPathIcon />}
            size="sm"
            variant="ghost"
            onClick={refresh}
          />
        </HStack>
        {captures.length === 0
          ? (
              <CapturesEmptyState
                onAdd={() => {
                  setIsComposerOpen(true);
                }}
              />
            )
          : (
              <Table<CaptureSummary>
                data={captures}
                columns={columns}
                idKey="id"
                hasHover
                density="compact"
              />
            )}
      </VStack>

      <CaptureDialog
        isOpen={isComposerOpen}
        onOpenChange={setIsComposerOpen}
        onCreated={() => {
          setIsComposerOpen(false);
        }}
      />

    </>
  );
}
