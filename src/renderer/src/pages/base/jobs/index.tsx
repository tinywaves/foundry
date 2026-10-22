import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Table, pixel } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import type { ScrapeJobStatus, ScrapeJobSummary } from '../../../../../shared/base';
import {
  baseKeys,
  listScrapeJobs,
  recapture,
  subscribeToScrapeJobFinished,
} from '@renderer/base';
import { getSettings, settingsKeys } from '@renderer/settings';
import { baseErrorKey } from '@renderer/base-error-key';
import { formatTimestamp } from '@renderer/format-timestamp';
import { useI18n } from '@renderer/i18n/use-i18n';
import { useAppToast } from '@renderer/use-app-toast';

const statusVariant: Record<ScrapeJobStatus, 'neutral' | 'success' | 'error'> = {
  pending: 'neutral',
  running: 'neutral',
  succeeded: 'success',
  failed: 'error',
};

export default function JobsPage() {
  const { captureId = '' } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [titlebarActions, setTitlebarActions] = useState<HTMLElement | null>(null);
  const settingsQuery = useQuery({ queryKey: settingsKeys.current(), queryFn: getSettings });
  const jobsQuery = useQuery({
    queryKey: baseKeys.jobs(captureId),
    queryFn: () => listScrapeJobs(captureId),
    enabled: Boolean(captureId),
  });
  const recaptureMutation = useMutation({
    mutationFn: recapture,
    onSuccess: (result) => {
      if (!result.ok) {
        toast({
          body: t(baseErrorKey(result.error.code)),
          type: 'error',
          uniqueID: result.error.code,
        });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: baseKeys.jobs(captureId) });
      toast({
        body: t('base.recaptureStarted'),
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
    void queryClient.invalidateQueries({ queryKey: baseKeys.jobs(captureId) });
    if (event.status === 'failed') {
      toast({
        body: t('base.scrapeFailed'),
        type: 'error',
        uniqueID: `scrape-failed-${event.jobId}`,
      });
    }
  }), [captureId, queryClient, t, toast]);

  const jobs = jobsQuery.data?.ok ? jobsQuery.data.data : [];
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: baseKeys.jobs(captureId) });
  };

  const columns = useMemo<Array<TableColumn<ScrapeJobSummary>>>(() => [
    {
      key: 'status',
      header: t('base.jobStatus'),
      width: pixel(80),
      renderCell: (job) => (
        <Badge
          label={t(`base.jobStatus.${job.status}`)}
          variant={statusVariant[job.status]}
        />
      ),
    },
    {
      key: 'fetcher',
      header: t('base.fetcher'),
      width: pixel(96),
      renderCell: (job) => (
        <Text>{job.fetcher === 'firecrawl' ? 'Firecrawl' : 'DeepSeek Fetch'}</Text>
      ),
    },
    {
      key: 'createdAt',
      header: t('base.createdAt'),
      width: pixel(128),
      renderCell: (job) => (
        <Text color="secondary">
          {settingsQuery.data ? formatTimestamp(job.createdAt, settingsQuery.data) : '—'}
        </Text>
      ),
    },
    {
      key: 'updatedAt',
      header: t('base.updatedAt'),
      width: pixel(128),
      renderCell: (job) => (
        <Text color="secondary">
          {settingsQuery.data ? formatTimestamp(job.updatedAt, settingsQuery.data) : '—'}
        </Text>
      ),
    },
    {
      key: 'error',
      header: t('base.error'),
      width: pixel(220),
      renderCell: (job) => (
        <Text
          color={job.errorMessage ? 'primary' : 'secondary'}
          display="block"
          maxLines={2}
          textWrap="wrap"
        >
          {job.errorMessage ?? '—'}
        </Text>
      ),
    },
  ], [settingsQuery.data, t]);

  return (
    <>
      {titlebarActions && createPortal(
        <HStack gap={2} vAlign="center">
          <IconButton
            label={t('base.refresh')}
            tooltip={t('base.refresh')}
            icon={<ArrowPathIcon />}
            size="sm"
            variant="ghost"
            onClick={refresh}
          />
          <Button
            label={t('base.recapture')}
            size="sm"
            variant="secondary"
            onClick={() => {
              recaptureMutation.mutate(captureId);
            }}
          />
        </HStack>,
        titlebarActions,
      )}
      <VStack gap={5}>
        <HStack gap={2} vAlign="center">
          <Button
            label={t('base.backToCaptures')}
            size="sm"
            variant="ghost"
            icon={<ArrowLeftIcon />}
            onClick={() => {
              void navigate('/base/captures');
            }}
          />
          <StackItem size="fill" />
        </HStack>
        {jobs.length === 0
          ? (
              <EmptyState
                title={t('base.noJobsTitle')}
                description={t('base.noJobsDescription')}
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
