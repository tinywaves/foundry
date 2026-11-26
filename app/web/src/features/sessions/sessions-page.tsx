import { Skeleton } from '@/components/ui/skeleton';
import { FilterTabs, FilterTab, CheckField, Notice } from '@/components/workbench';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { MessagesSquare as ChatBubbleLeftRightIcon, Terminal as CommandLineIcon, Inbox as InboxStackIcon, Sparkles as SparklesIcon, RefreshCw as ArrowPathIcon } from 'lucide-react';
import chatgptIcon from '@lobehub/icons-static-svg/icons/openai.svg';
import claudeCodeIcon from '@lobehub/icons-static-svg/icons/claudecode.svg';
import { ApiError } from '../../lib/api';
import { formatTimestamp } from '../../lib/format-time';
import { useI18n } from '../../i18n';
import { FeatureEmptyState } from '../../components/feature-empty-state';
import { TitlebarActions } from '../../components/titlebar-actions';
import { getSettings, settingsKeys } from '../settings/api';
import { getSessions, sessionKeys } from './api';
import type { SessionSnapshot, SessionSource, SessionWarning } from './types';
import { ThreadGroups } from './thread-groups';
import type { TranslationKey } from '../../i18n';

export default function SessionsPage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const source: SessionSource = searchParams.get('source') === 'claude'
    ? 'claude'
    : 'codex';
  const [isShowingArchived, setIsShowingArchived] = useState(false);
  const settingsQuery = useQuery({
    queryKey: settingsKeys.current(),
    queryFn: getSettings,
  });
  const sessionQuery = useQuery({
    queryKey: sessionKeys.source(source),
    queryFn: () => getSessions(source),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const formatUpdatedAt = useCallback((value: string) => {
    if (!value) {
      return '';
    }
    if (settingsQuery.data) {
      return formatTimestamp(value, settingsQuery.data);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
  }, [settingsQuery.data]);
  const snapshot = sessionQuery.data;
  const archivedCount = snapshot?.threads.filter((thread) => thread.archived).length ?? 0;
  const showArchivedFilter = !sessionQuery.isPending
    && snapshot
    && !(sessionQuery.error && snapshot.threads.length === 0)
    && (snapshot.threads.length > 0 || snapshot.warnings.length > 0)
    && (source === 'codex' || archivedCount > 0);
  const sourceLabel = t(source === 'codex'
    ? 'sessions.codex'
    : 'sessions.claudeCode');
  return (
    <>
      <TitlebarActions>
        <div className="flex flex-row items-center gap-2">
          <Button
            onClick={() => {
              void sessionQuery.refetch();
            }}
            variant="ghost"
            size="icon-sm"
            disabled={sessionQuery.isFetching}
            aria-label={t(sessionQuery.isFetching ? 'sessions.loading' : 'sessions.refresh')}
            title={t(sessionQuery.isFetching ? 'sessions.loading' : 'sessions.refresh')}
          >
            {sessionQuery.isFetching && <Spinner />}
            <ArrowPathIcon />
          </Button>
        </div>
      </TitlebarActions>

      <div className="flex flex-col gap-4">
        <div className="flex flex-row flex-wrap items-center gap-4">
          <FilterTabs
            label={t('sessions.source')}
            size="sm"
            value={source}
            onChange={(value) => {
              if (value !== 'codex' && value !== 'claude') {
                return;
              }
              const nextSearchParams = new URLSearchParams(searchParams);
              if (value === 'claude') {
                nextSearchParams.set('source', 'claude');
              } else {
                nextSearchParams.delete('source');
              }
              setSearchParams(nextSearchParams);
            }}
          >
            <FilterTab value="codex" label={t('sessions.codex')} icon={<img src={chatgptIcon} alt="" className="size-full dark:invert" />} />
            <FilterTab value="claude" label={t('sessions.claudeCode')} icon={<img src={claudeCodeIcon} alt="" className="size-full dark:invert" />} />
          </FilterTabs>
          {showArchivedFilter
            ? (<CheckField label={`${t('sessions.includeArchived')} (${archivedCount})`} size="sm" value={isShowingArchived} onChange={setIsShowingArchived} />)
            : null}
        </div>

        <SourceSessions key={source} sourceLabel={sourceLabel} isPending={sessionQuery.isPending} isFetching={sessionQuery.isFetching} error={sessionQuery.error} snapshot={snapshot} isShowingArchived={isShowingArchived} archivedCount={archivedCount} formatUpdatedAt={formatUpdatedAt} />
      </div>
    </>
  );
}
function SourceSessions({ sourceLabel, isPending, isFetching, error, snapshot, isShowingArchived, archivedCount, formatUpdatedAt }: {
  sourceLabel: string;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  snapshot: SessionSnapshot | undefined;
  isShowingArchived: boolean;
  archivedCount: number;
  formatUpdatedAt: (value: string) => string;
}) {
  const { t } = useI18n();
  if (isPending) {
    return <SessionSkeleton />;
  }
  const errorCode = error instanceof ApiError ? error.code : undefined;
  if (!snapshot && errorCode?.endsWith('_DATA_NOT_FOUND')) {
    return <SessionsEmptyState source={sourceLabel} />;
  }
  if (error && (!snapshot || snapshot.threads.length === 0)) {
    return (<Notice status="error" title={t('sessions.errorTitle')} description={t('sessions.errorDescription')} />);
  }
  if (!snapshot) {
    return <SessionSkeleton />;
  }
  if (snapshot.threads.length === 0 && snapshot.warnings.length === 0) {
    return <SessionsEmptyState source={sourceLabel} />;
  }
  const hasVisibleThreads = snapshot.threads.some((thread) => ((isShowingArchived || !thread.archived)));
  const hasHiddenArchived = archivedCount > 0 && !isShowingArchived;
  let emptyDescription: TranslationKey = 'sessions.noThreadsDescription';
  if (snapshot.threads.length === 0) {
    emptyDescription = 'sessions.noReadableDescription';
  } else if (hasHiddenArchived) {
    emptyDescription = 'sessions.showArchivedHint';
  }
  return (
    <div aria-busy={isFetching} className="flex flex-col gap-4">
      {error
        ? (<Notice status="error" title={t('sessions.errorTitle')} description={t('sessions.errorDescription')} />)
        : null}
      {snapshot.warnings.map((warning) => (<Notice key={`${warning.code}-${warning.count ?? 'all'}`} status="warning" title={t('sessions.warningTitle')} description={warningDescription(warning, t)} />))}
      {hasVisibleThreads
        ? (<ThreadGroups key={isShowingArchived ? 'archived' : 'active'} snapshot={snapshot} isShowingArchived={isShowingArchived} formatUpdatedAt={formatUpdatedAt} />)
        : (<FeatureEmptyState startIcon={InboxStackIcon} centerIcon={CommandLineIcon} endIcon={SparklesIcon} title={t(snapshot.threads.length === 0 ? 'sessions.noReadableTitle' : 'sessions.noThreadsTitle')} description={t(emptyDescription)} />)}
    </div>
  );
}
function SessionsEmptyState({ source }: {
  source: string;
}) {
  const { t } = useI18n();
  return (<FeatureEmptyState startIcon={SparklesIcon} centerIcon={ChatBubbleLeftRightIcon} endIcon={InboxStackIcon} title={t('sessions.emptyTitle', { source })} description={t('sessions.emptyDescription', { source })} />);
}
function SessionSkeleton() {
  return (
    <div aria-busy="true">
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, index) => (<Skeleton key={index} className="h-[44px]" />))}
      </div>
    </div>
  );
}
function warningDescription(warning: SessionWarning, t: (key: TranslationKey, values?: Record<string, string | number>) => string): string {
  return t('sessions.filesUnreadable', { count: warning.count ?? 0 });
}
