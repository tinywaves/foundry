import type { DataColumn } from '@/components/workbench';
import { Button } from '@/components/ui/button';
import { Hint, EmptyMessage, DataTable } from '@/components/workbench';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { RefreshCw as ArrowPathIcon } from 'lucide-react';
import type { FetchJobSummary } from './types';
import { captureKeys, listFetchJobs, recapture } from './api';
import { captureErrorKey, useI18n } from '../../i18n';
import { fetcherLabelKey } from '../../i18n/fetchers';
import { useAppToast } from '../../lib/api';
import { TitlebarActions } from '../../components/titlebar-actions';

export default function JobsPage() {
  const { captureId = '' } = useParams();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const jobsQuery = useQuery({
    queryKey: captureKeys.jobs(captureId),
    queryFn: () => listFetchJobs(captureId),
    enabled: Boolean(captureId),
  });
  const recaptureMutation = useMutation({
    mutationFn: recapture,
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          body: t(captureErrorKey(result.error.code)),
          type: 'error',
          uniqueID: result.error.code,
        });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: captureKeys.jobs(captureId) });
      toast({
        body: t('captures.recaptureStarted'),
        uniqueID: 'recapture-started',
      });
    },
  });
  const jobs = jobsQuery.data?.ok ? jobsQuery.data.data : [];
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: captureKeys.jobs(captureId) });
  };
  const columns = useMemo<Array<DataColumn<FetchJobSummary>>>(() => [
    {
      key: 'status',
      header: t('captures.jobStatus'),
      width: 120,
      renderCell: (job) => (
        <Badge variant={job.status === 'failed' ? 'destructive' : 'secondary'}>
          <span>{t(`captures.jobStatus.${job.status}`)}</span>
        </Badge>
      ),
    },
    {
      key: 'fetcher',
      header: t('captures.fetcher'),
      width: 160,
      renderCell: (job) => (<span>{t(fetcherLabelKey(job.fetcher))}</span>),
    },
    {
      key: 'creditsUsed',
      header: t('captures.creditsUsed'),
      width: 96,
      renderCell: (job) => (
        <span>
          {job.creditsUsed ?? '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: t('captures.createdAt'),
      width: 200,
      renderCell: (job) => (<span className="text-muted-foreground">{job.createdAt}</span>),
    },
    {
      key: 'updatedAt',
      header: t('captures.updatedAt'),
      width: 200,
      renderCell: (job) => (<span className="text-muted-foreground">{job.updatedAt}</span>),
    },
    {
      key: 'error',
      header: t('captures.error'),
      width: 220,
      renderCell: (job) => (job.errorMessage
        ? (
            <Hint content={job.errorMessage}>
              <span className="line-clamp-2 whitespace-normal block">
                {job.errorMessage}
              </span>
            </Hint>
          )
        : <span className="text-muted-foreground">—</span>),
    },
  ], [t]);
  return (
    <>
      <TitlebarActions>
        <div className="flex flex-row items-center gap-2">
          <Button onClick={refresh} variant="ghost" size="icon-sm" aria-label={t('captures.refresh')} title={t('captures.refresh')}>
            <ArrowPathIcon />
          </Button>
          <Button
            onClick={() => {
              recaptureMutation.mutate(captureId);
            }}
            variant="default"
            size="sm"
          >
            <span>{t('captures.recapture')}</span>
          </Button>
        </div>
      </TitlebarActions>
      <div className="flex flex-col gap-5">
        {jobs.length === 0
          ? (<EmptyMessage title={t('captures.noJobsTitle')} description={t('captures.noJobsDescription')} />)
          : (<DataTable<FetchJobSummary> data={jobs} columns={columns} idKey="id" />)}
      </div>
    </>
  );
}
