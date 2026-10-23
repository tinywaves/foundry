import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowPathRoundedSquareIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Stack';
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
  useTableStickyColumns,
} from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import type { CaptureFilter, CaptureSummary } from '../../../../../shared/captures';
import {
  captureKeys,
  deleteCapture,
  listCaptures,
  recapture,
  subscribeToScrapeJobFinished,
} from '@renderer/apis/captures';
import { captureErrorKey } from '@renderer/pages/library/capture-error-key';
import { useI18n } from '@renderer/i18n/use-i18n';
import { useAppToast } from '@renderer/hooks/use-app-toast';
import { CaptureDialog } from './capture-dialog';
import { CapturesEmptyState } from './empty-state';
import { NoteCell } from './note-cell';
import { styles } from './styles';

const stickyTableStyle = {
  '--table-sticky-background': 'var(--color-background-surface)',
} as CSSProperties;

export default function CapturesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [filter, setFilter] = useState<CaptureFilter>('all');
  const [titlebarActions, setTitlebarActions] = useState<HTMLElement | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [captureToDelete, setCaptureToDelete] = useState<CaptureSummary | null>(null);
  const stickyColumns = useTableStickyColumns<CaptureSummary>({ endKeys: ['actions'] });

  const capturesQuery = useQuery({
    queryKey: captureKeys.list(filter),
    queryFn: () => listCaptures(filter),
  });
  const recaptureMutation = useMutation({
    mutationFn: recapture,
    onSuccess: (result) => {
      toast(result.ok
        ? {
            body: t('captures.recaptureStarted'),
            uniqueID: 'recapture-started',
          }
        : {
            body: t(captureErrorKey(result.error.code)),
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
          body: t(captureErrorKey(result.error.code)),
          type: 'error',
          uniqueID: result.error.code,
        });
        setCaptureToDelete(null);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: captureKeys.all });
      toast({
        body: t('captures.captureDeleted'),
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
      void queryClient.invalidateQueries({ queryKey: captureKeys.all });
      return;
    }
    toast({
      body: t('captures.scrapeFailed'),
      type: 'error',
      uniqueID: `scrape-failed-${event.jobId}`,
    });
  }), [queryClient, t, toast]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: captureKeys.list(filter) });
  };

  const columns = useMemo<Array<TableColumn<CaptureSummary>>>(() => [
    {
      key: 'url',
      header: t('captures.url'),
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
      header: t('captures.title'),
      width: proportional(2),
      renderCell: (capture) => (
        <Text maxLines={1}>{capture.title ?? ''}</Text>
      ),
    },
    {
      key: 'note',
      header: t('captures.note'),
      width: proportional(2),
      renderCell: (capture) => <NoteCell capture={capture} />,
    },
    {
      key: 'updatedAt',
      header: t('captures.updatedAt'),
      width: pixel(160),
      renderCell: (capture) => (
        <Text color="secondary">{capture.updatedAt}</Text>
      ),
    },
    {
      key: 'createdAt',
      header: t('captures.createdAt'),
      width: pixel(160),
      renderCell: (capture) => (
        <Text color="secondary">{capture.createdAt}</Text>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: pixel(184),
      align: 'end',
      renderCell: (capture) => (
        <HStack gap={1} hAlign="end">
          <IconButton
            label={t('captures.viewDetails')}
            tooltip={t('captures.viewDetails')}
            icon={<EyeIcon />}
            size="sm"
            variant="ghost"
            onClick={() => {
              void navigate(`/library/captures/${capture.id}`);
            }}
          />
          <IconButton
            label={t('captures.viewJobs')}
            tooltip={t('captures.viewJobs')}
            icon={<ClipboardDocumentListIcon />}
            size="sm"
            variant="ghost"
            onClick={() => {
              void navigate(`/library/captures/${capture.id}/jobs`);
            }}
          />
          <IconButton
            label={t('captures.recapture')}
            tooltip={t('captures.recapture')}
            icon={<ArrowPathRoundedSquareIcon />}
            size="sm"
            variant="ghost"
            onClick={() => {
              recaptureMutation.mutate(capture.id);
            }}
          />
          <Popover
            label={`${t('captures.delete')} ${capture.url}`}
            isOpen={captureToDelete?.id === capture.id}
            onOpenChange={(isOpen) => {
              setCaptureToDelete(isOpen ? capture : null);
            }}
            content={(
              <VStack gap={3}>
                <Text type="label">{t('captures.deleteCaptureTitle')}</Text>
                <HStack gap={2} hAlign="end">
                  <Button
                    label={t('captures.cancel')}
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCaptureToDelete(null);
                    }}
                  />
                  <Button
                    label={t('captures.delete')}
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
              label={t('captures.delete')}
              tooltip={t('captures.delete')}
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
        <HStack gap={2} vAlign="center">
          <IconButton
            label={t('captures.refresh')}
            tooltip={t('captures.refresh')}
            icon={<ArrowPathIcon />}
            size="sm"
            variant="ghost"
            onClick={refresh}
          />
          <Button
            label={t('captures.addCapture')}
            size="sm"
            variant="primary"
            onClick={() => {
              setIsComposerOpen(true);
            }}
          />
        </HStack>,
        titlebarActions,
      )}
      <VStack gap={5}>
        <SegmentedControl
          label={t('captures.captureFilter')}
          size="sm"
          value={filter}
          onChange={(value) => {
            setFilter(value as CaptureFilter);
          }}
        >
          <SegmentedControlItem value="all" label={t('captures.allCaptures')} />
          <SegmentedControlItem value="no-successful" label={t('captures.noCapturedContent')} />
        </SegmentedControl>
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
                plugins={{ stickyColumns }}
                style={stickyTableStyle}
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
