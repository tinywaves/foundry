import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Table, pixel } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import type { ScrapeJobStatus, ScrapeJobSummary } from '../../../../../shared/captures';
import {
  captureKeys,
  listScrapeJobs,
  recapture,
  subscribeToScrapeJobFinished,
} from '@renderer/apis/captures';
import { captureErrorKey } from '@renderer/pages/library/capture-error-key';
import { useI18n } from '@renderer/i18n/use-i18n';
import { useAppToast } from '@renderer/hooks/use-app-toast';

const statusVariant: Record<ScrapeJobStatus, 'neutral' | 'success' | 'error'> = {
  pending: 'neutral',
  running: 'neutral',
  succeeded: 'success',
  failed: 'error',
};

export default function JobsPage() {
  const { captureId = '' } = useParams();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [titlebarActions, setTitlebarActions] = useState<HTMLElement | null>(null);
  const jobsQuery = useQuery({
    queryKey: captureKeys.jobs(captureId),
    queryFn: () => listScrapeJobs(captureId),
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect
    setTitlebarActions(document.getElementById('window-titlebar-actions'));
  }, []);

  useEffect(() => subscribeToScrapeJobFinished((event) => {
    if (event.captureId !== captureId) {
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: event.status === 'succeeded'
        ? captureKeys.all
        : captureKeys.jobs(captureId),
    });
    if (event.status === 'failed') {
      toast({
        body: t('captures.scrapeFailed'),
        type: 'error',
        uniqueID: `scrape-failed-${event.jobId}`,
      });
    }
  }), [captureId, queryClient, t, toast]);

  const jobs = jobsQuery.data?.ok ? jobsQuery.data.data : [];
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: captureKeys.jobs(captureId) });
  };

  const columns = useMemo<Array<TableColumn<ScrapeJobSummary>>>(() => [
    {
      key: 'status',
      header: t('captures.jobStatus'),
      width: pixel(120),
      renderCell: (job) => (
        <Badge
          label={t(`captures.jobStatus.${job.status}`)}
          variant={statusVariant[job.status]}
        />
      ),
    },
    {
      key: 'fetcher',
      header: t('captures.fetcher'),
      width: pixel(160),
      renderCell: (job) => (
        <Text>{job.fetcher === 'firecrawl' ? 'Firecrawl' : 'DeepSeek Fetch'}</Text>
      ),
    },
    {
      key: 'createdAt',
      header: t('captures.createdAt'),
      width: pixel(200),
      renderCell: (job) => (
        <Text color="secondary">{job.createdAt}</Text>
      ),
    },
    {
      key: 'updatedAt',
      header: t('captures.updatedAt'),
      width: pixel(200),
      renderCell: (job) => (
        <Text color="secondary">{job.updatedAt}</Text>
      ),
    },
    {
      key: 'error',
      header: t('captures.error'),
      width: pixel(220),
      renderCell: (job) => (job.errorMessage
        ? (
            <Tooltip content={job.errorMessage}>
              <Text
                color="primary"
                display="block"
                maxLines={2}
                textWrap="wrap"
              >
                {job.errorMessage}
              </Text>
            </Tooltip>
          )
        : <Text color="secondary">—</Text>),
    },
  ], [t]);

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
            label={t('captures.recapture')}
            size="sm"
            variant="primary"
            onClick={() => {
              recaptureMutation.mutate(captureId);
            }}
          />
        </HStack>,
        titlebarActions,
      )}
      <VStack gap={5}>
        {jobs.length === 0
          ? (
              <EmptyState
                title={t('captures.noJobsTitle')}
                description={t('captures.noJobsDescription')}
              />
            )
          : (
              <Table<ScrapeJobSummary>
                data={jobs}
                columns={columns}
                idKey="id"
                textOverflow="truncate"
              />
            )}
      </VStack>
    </>
  );
}
