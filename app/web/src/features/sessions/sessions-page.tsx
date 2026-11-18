import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CodeBracketIcon,
  CommandLineIcon,
  InboxStackIcon,
  SparklesIcon,
  ArrowPathIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { useSearchParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { formatTimestamp } from '../../lib/format-time';
import { useI18n } from '../../i18n';
import { FeatureEmptyState } from '../../components/feature-empty-state';
import { TitlebarActions } from '../../components/titlebar-actions';
import { getSettings, settingsKeys } from '../settings/api';
import { getCodexSessions, sessionKeys } from './api';
import type { CodexSessionSnapshot, SessionWarning } from './types';
import { ThreadTable } from './thread-table';
import type { TranslationKey } from '../../i18n';

export default function SessionsPage() {
  type SessionSource = 'codex' | 'claude';
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const source: SessionSource = searchParams.get('source') === 'claude'
    ? 'claude'
    : 'codex';
  const [isShowingArchived, setIsShowingArchived] = useState(false);
  const [isShowingSubagents, setIsShowingSubagents] = useState(false);
  const settingsQuery = useQuery({
    queryKey: settingsKeys.current(),
    queryFn: getSettings,
  });
  const codexQuery = useQuery({
    queryKey: sessionKeys.codex,
    queryFn: getCodexSessions,
    enabled: source === 'codex',
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

  const snapshot = codexQuery.data;
  const archivedCount = snapshot?.threads.filter((thread) => thread.archived).length ?? 0;
  const subagentCount = snapshot?.threads.filter((thread) => thread.subagent).length ?? 0;

  return (
    <>
      {source === 'codex' && (
        <TitlebarActions>
          <HStack gap={2} vAlign="center">
            <IconButton
              label={t('sessions.refresh')}
              tooltip={t('sessions.refresh')}
              icon={<ArrowPathIcon />}
              size="sm"
              variant="ghost"
              isLoading={codexQuery.isFetching}
              onClick={() => {
                void codexQuery.refetch();
              }}
            />
            <Button
              label={t('sessions.moveToFoundry')}
              size="sm"
              variant="primary"
              isDisabled
              tooltip={t('sessions.comingSoon')}
            />
            <Button
              label={t('sessions.cloudSync')}
              size="sm"
              variant="secondary"
              isDisabled
              tooltip={t('sessions.comingSoon')}
            />
          </HStack>
        </TitlebarActions>
      )}

      <VStack gap={4}>
        <SegmentedControl
          label={t('sessions.source')}
          size="sm"
          value={source}
          onChange={(nextSource) => {
            setSearchParams({ source: nextSource });
          }}
        >
          <SegmentedControlItem value="codex" label={t('sessions.codex')} />
          <SegmentedControlItem value="claude" label={t('sessions.claudeCode')} />
        </SegmentedControl>

        {source === 'claude'
          ? (
              <FeatureEmptyState
                startIcon={SparklesIcon}
                centerIcon={CodeBracketIcon}
                endIcon={CloudIcon}
                title={t('sessions.claudeTitle')}
                description={t('sessions.claudeDescription')}
              />
            )
          : (
              <CodexSessions
                isPending={codexQuery.isPending}
                isFetching={codexQuery.isFetching}
                error={codexQuery.error}
                snapshot={snapshot}
                isShowingArchived={isShowingArchived}
                isShowingSubagents={isShowingSubagents}
                archivedCount={archivedCount}
                subagentCount={subagentCount}
                onShowArchivedChange={setIsShowingArchived}
                onShowSubagentsChange={setIsShowingSubagents}
                formatUpdatedAt={formatUpdatedAt}
              />
            )}
      </VStack>
    </>
  );
}

function CodexSessions({
  isPending,
  isFetching,
  error,
  snapshot,
  isShowingArchived,
  isShowingSubagents,
  archivedCount,
  subagentCount,
  onShowArchivedChange,
  onShowSubagentsChange,
  formatUpdatedAt,
}: {
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  snapshot: CodexSessionSnapshot | undefined;
  isShowingArchived: boolean;
  isShowingSubagents: boolean;
  archivedCount: number;
  subagentCount: number;
  onShowArchivedChange: (isChecked: boolean) => void;
  onShowSubagentsChange: (isChecked: boolean) => void;
  formatUpdatedAt: (value: string) => string;
}) {
  const { t } = useI18n();

  if (isPending) {
    return <SessionSkeleton />;
  }

  const errorCode = error instanceof ApiError ? error.code : undefined;

  if (!snapshot && errorCode === 'CODEX_DATA_NOT_FOUND') {
    return (
      <FeatureEmptyState
        startIcon={CommandLineIcon}
        centerIcon={CodeBracketIcon}
        endIcon={InboxStackIcon}
        title={t('sessions.emptyTitle')}
        description={t('sessions.emptyDescription')}
      />
    );
  }

  if (!snapshot && error) {
    const isUnsupported = errorCode === 'UNSUPPORTED_CODEX_SCHEMA';
    return (
      <Banner
        status="error"
        title={t(isUnsupported
          ? 'sessions.unsupportedTitle'
          : 'sessions.errorTitle')}
        description={t(isUnsupported
          ? 'sessions.unsupportedDescription'
          : 'sessions.errorDescription')}
      />
    );
  }

  if (!snapshot) {
    return <SessionSkeleton />;
  }

  const hasVisibleThreads = snapshot.threads.some((thread) => (
    (isShowingArchived || !thread.archived)
    && (isShowingSubagents || !thread.subagent)
  ));

  return (
    <VStack gap={4} aria-busy={isFetching}>
      {error
        ? (
            <Banner
              status="error"
              title={t('sessions.errorTitle')}
              description={t('sessions.errorDescription')}
            />
          )
        : null}
      {snapshot.warnings.map((warning) => (
        <Banner
          key={`${warning.code}-${warning.count ?? 'all'}`}
          status="warning"
          title={t('sessions.warningTitle')}
          description={warningDescription(warning, t)}
        />
      ))}
      <HStack gap={3} vAlign="center">
        <CheckboxInput
          label={`${t('sessions.archived')} (${archivedCount})`}
          size="sm"
          value={isShowingArchived}
          onChange={onShowArchivedChange}
        />
        <CheckboxInput
          label={`${t('sessions.subagents')} (${subagentCount})`}
          size="sm"
          value={isShowingSubagents}
          onChange={onShowSubagentsChange}
        />
      </HStack>
      {hasVisibleThreads
        ? (
            <ThreadTable
              key={`${isShowingArchived ? 'archived' : 'active'}-${isShowingSubagents ? 'subagents' : 'user'}`}
              snapshot={snapshot}
              isShowingArchived={isShowingArchived}
              isShowingSubagents={isShowingSubagents}
              formatUpdatedAt={formatUpdatedAt}
            />
          )
        : (
            <FeatureEmptyState
              startIcon={InboxStackIcon}
              centerIcon={CommandLineIcon}
              endIcon={SparklesIcon}
              title={t('sessions.noThreadsTitle')}
              description={t('sessions.noThreadsDescription')}
            />
          )}
    </VStack>
  );
}

function SessionSkeleton() {
  return (
    <div aria-busy="true">
      <VStack gap={2}>
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} height={44} index={index} />
        ))}
      </VStack>
    </div>
  );
}

function warningDescription(
  warning: SessionWarning,
  t: (key: TranslationKey) => string,
): string {
  return warning.code === 'PROJECTS_UNAVAILABLE' ? t('sessions.warningProjectsUnavailable') : `${warning.count ?? 0} ${t('sessions.filesUnreadable')}`;
}
