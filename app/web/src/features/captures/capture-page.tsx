import type { DataColumn } from '@/components/workbench';
import { Spinner } from '@/components/ui/spinner';
import { ActionPopover, FilterTabs, FilterTab, DataTable } from '@/components/workbench';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { RefreshCw as ArrowPathIcon, RefreshCcw as ArrowPathRoundedSquareIcon, ClipboardList as ClipboardDocumentListIcon, Eye as EyeIcon, Globe as GlobeAltIcon, Inbox as InboxStackIcon, Link as HeroLinkIcon, Plus as PlusIcon, Trash2 as TrashIcon } from 'lucide-react';
import type { CaptureFilter, CaptureSummary } from './types';
import { FeatureEmptyState } from '../../components/feature-empty-state';
import { countCaptures, captureKeys, deleteCapture, listCaptures, recapture } from './api';
import { captureErrorKey, useI18n } from '../../i18n';
import { TitlebarActions } from '../../components/titlebar-actions';
import { useAppToast } from '../../lib/api';
import { CaptureDialog } from './capture-create-dialog';
import { NoteCell } from './capture-note-cell';

function countLabel(label: string, value: number | undefined): string {
  return value === undefined ? label : `${label} (${value})`;
}
export default function CapturesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [filter, setFilter] = useState<CaptureFilter>('all');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [captureToDelete, setCaptureToDelete] = useState<CaptureSummary | null>(null);
  const capturesQuery = useQuery({
    queryKey: captureKeys.list(filter),
    queryFn: () => listCaptures(filter),
  });
  const captureCountsQuery = useQuery({
    queryKey: captureKeys.counts(),
    queryFn: countCaptures,
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
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: captureKeys.list(filter) });
  };
  const columns = useMemo<Array<DataColumn<CaptureSummary>>>(() => [
    {
      key: 'url',
      header: t('captures.url'),
      width: '30%',
      renderCell: (capture) => (
        <a href={capture.url} target="_blank" rel="noreferrer" className="block w-full truncate text-primary underline-offset-4 hover:underline">
          {capture.url}
        </a>
      ),
    },
    {
      key: 'title',
      header: t('captures.title'),
      width: '20%',
      renderCell: (capture) => (<span className="truncate">{capture.title ?? ''}</span>),
    },
    {
      key: 'note',
      header: t('captures.note'),
      width: '20%',
      renderCell: (capture) => <NoteCell capture={capture} />,
    },
    {
      key: 'updatedAt',
      header: t('captures.updatedAt'),
      width: 160,
      renderCell: (capture) => (<span className="text-muted-foreground">{capture.updatedAt}</span>),
    },
    {
      key: 'createdAt',
      header: t('captures.createdAt'),
      width: 160,
      renderCell: (capture) => (<span className="text-muted-foreground">{capture.createdAt}</span>),
    },
    {
      key: 'actions',
      header: '',
      width: 184,
      align: 'end',
      renderCell: (capture) => (
        <div className="flex flex-row justify-end gap-1">
          <Button
            onClick={() => {
              void navigate(`/library/captures/${capture.id}`);
            }}
            variant="ghost"
            size="icon-sm"
            aria-label={t('captures.viewDetails')}
            title={t('captures.viewDetails')}
          >
            <EyeIcon />
          </Button>
          <Button
            onClick={() => {
              void navigate(`/library/captures/${capture.id}/jobs`);
            }}
            variant="ghost"
            size="icon-sm"
            aria-label={t('captures.viewJobs')}
            title={t('captures.viewJobs')}
          >
            <ClipboardDocumentListIcon />
          </Button>
          <Button
            onClick={() => {
              recaptureMutation.mutate(capture.id);
            }}
            variant="ghost"
            size="icon-sm"
            aria-label={t('captures.recapture')}
            title={t('captures.recapture')}
          >
            <ArrowPathRoundedSquareIcon />
          </Button>
          <ActionPopover
            label={`${t('captures.delete')} ${capture.url}`}
            isOpen={captureToDelete?.id === capture.id}
            onOpenChange={(isOpen) => {
              setCaptureToDelete(isOpen ? capture : null);
            }}
            content={(
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">{t('captures.deleteCaptureTitle')}</span>
                <div className="flex flex-row justify-end gap-2">
                  <Button
                    onClick={() => {
                      setCaptureToDelete(null);
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <span>{t('captures.cancel')}</span>
                  </Button>
                  <Button
                    onClick={() => {
                      captureRemoval.mutate(capture.id);
                    }}
                    variant="destructive"
                    size="sm"
                    disabled={captureRemoval.isPending && captureToDelete?.id === capture.id}
                  >
                    {captureRemoval.isPending && captureToDelete?.id === capture.id && <Spinner />}
                    <span>{t('captures.delete')}</span>
                  </Button>
                </div>
              </div>
            )}
          >
            <Button variant="ghost" size="icon-sm" aria-label={t('captures.delete')} title={t('captures.delete')}>
              <TrashIcon />
            </Button>
          </ActionPopover>
        </div>
      ),
    },
  ], [captureRemoval, captureToDelete, navigate, recaptureMutation, t]);
  const captures = capturesQuery.data ?? [];
  const captureCounts = captureCountsQuery.data;
  return (
    <>
      <TitlebarActions>
        <div className="flex flex-row items-center gap-2">
          <Button onClick={refresh} variant="ghost" size="icon-sm" aria-label={t('captures.refresh')} title={t('captures.refresh')}>
            <ArrowPathIcon />
          </Button>
          <Button
            onClick={() => {
              setIsComposerOpen(true);
            }}
            variant="default"
            size="sm"
          >
            <span>{t('captures.addCapture')}</span>
          </Button>
        </div>
      </TitlebarActions>
      <div className="flex flex-col gap-5">
        <FilterTabs
          label={t('captures.captureFilter')}
          size="sm"
          value={filter}
          onChange={(value) => {
            setFilter(value as CaptureFilter);
          }}
        >
          <FilterTab value="all" label={countLabel(t('captures.allCaptures'), captureCounts?.all)} />
          <FilterTab value="no-successful" label={countLabel(t('captures.noCapturedContent'), captureCounts?.noSuccessful)} />
        </FilterTabs>
        {captures.length === 0
          ? (
              <FeatureEmptyState
                startIcon={GlobeAltIcon}
                centerIcon={HeroLinkIcon}
                endIcon={InboxStackIcon}
                title={t('captures.emptyTitle')}
                description={t('captures.emptyDescription')}
                actions={(
                  <Button
                    onClick={() => {
                      setIsComposerOpen(true);
                    }}
                    variant="default"
                    size="sm"
                  >
                    <PlusIcon />
                    <span>{t('captures.addCapture')}</span>
                  </Button>
                )}
              />
            )
          : (<DataTable<CaptureSummary> data={captures} columns={columns} idKey="id" stickyEndKeys={['actions']} />)}
      </div>

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
