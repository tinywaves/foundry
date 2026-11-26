import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  CommandLineIcon,
  InboxStackIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Banner } from '@astryxdesign/core/Banner';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';
import chatgptIcon from '@lobehub/icons-static-svg/icons/openai.svg';
import claudeCodeIcon from '@lobehub/icons-static-svg/icons/claudecode.svg';
import { ApiError } from '../../lib/api';
import { formatTimestamp } from '../../lib/format-time';
import { useI18n } from '../../i18n';
import { FeatureEmptyState } from '../../components/feature-empty-state';
import { TitlebarActions } from '../../components/titlebar-actions';
import { getSettings, settingsKeys } from '../settings/api';
import { getSessions, sessionKeys } from './api';
import type {
  SessionSnapshot,
  SessionSource,
  SessionWarning,
} from './types';
import { ThreadTable } from './thread-table';
import type { TranslationKey } from '../../i18n';

const styles = stylex.create({
  sourceIcon: (icon: string) => ({
    width: '100%',
    height: '100%',
    backgroundColor: 'currentColor',
    maskImage: `url("${icon}")`,
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: 'contain',
  }),
});

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
        <HStack gap={2} vAlign="center">
          <IconButton
            label={t(sessionQuery.isFetching ? 'sessions.loading' : 'sessions.refresh')}
            tooltip={t(sessionQuery.isFetching ? 'sessions.loading' : 'sessions.refresh')}
            icon={<ArrowPathIcon />}
            size="sm"
            variant="ghost"
            isLoading={sessionQuery.isFetching}
            onClick={() => {
              void sessionQuery.refetch();
            }}
          />
        </HStack>
      </TitlebarActions>

      <VStack gap={4}>
        <HStack gap={4} vAlign="center" wrap="wrap">
          <SegmentedControl
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
            <SegmentedControlItem
              value="codex"
              label={t('sessions.codex')}
              icon={<span aria-hidden="true" {...stylex.props(styles.sourceIcon(chatgptIcon))} />}
            />
            <SegmentedControlItem
              value="claude"
              label={t('sessions.claudeCode')}
              icon={<span aria-hidden="true" {...stylex.props(styles.sourceIcon(claudeCodeIcon))} />}
            />
          </SegmentedControl>
          {showArchivedFilter
            ? (
                <CheckboxInput
                  label={`${t('sessions.includeArchived')} (${archivedCount})`}
                  size="sm"
                  value={isShowingArchived}
                  onChange={setIsShowingArchived}
                />
              )
            : null}
        </HStack>

        <SourceSessions
          key={source}
          sourceLabel={sourceLabel}
          isPending={sessionQuery.isPending}
          isFetching={sessionQuery.isFetching}
          error={sessionQuery.error}
          snapshot={snapshot}
          isShowingArchived={isShowingArchived}
          archivedCount={archivedCount}
          formatUpdatedAt={formatUpdatedAt}
        />
      </VStack>
    </>
  );
}

function SourceSessions({
  sourceLabel,
  isPending,
  isFetching,
  error,
  snapshot,
  isShowingArchived,
  archivedCount,
  formatUpdatedAt,
}: {
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
    return (
      <Banner
        status="error"
        title={t('sessions.errorTitle')}
        description={t('sessions.errorDescription')}
      />
    );
  }

  if (!snapshot) {
    return <SessionSkeleton />;
  }

  if (snapshot.threads.length === 0 && snapshot.warnings.length === 0) {
    return <SessionsEmptyState source={sourceLabel} />;
  }

  const hasVisibleThreads = snapshot.threads.some((thread) => (
    (isShowingArchived || !thread.archived)
  ));
  const hasHiddenArchived = archivedCount > 0 && !isShowingArchived;
  let emptyDescription: TranslationKey = 'sessions.noThreadsDescription';
  if (snapshot.threads.length === 0) {
    emptyDescription = 'sessions.noReadableDescription';
  } else if (hasHiddenArchived) {
    emptyDescription = 'sessions.showArchivedHint';
  }

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
      {hasVisibleThreads
        ? (
            <ThreadTable
              key={isShowingArchived ? 'archived' : 'active'}
              snapshot={snapshot}
              isShowingArchived={isShowingArchived}
              formatUpdatedAt={formatUpdatedAt}
            />
          )
        : (
            <FeatureEmptyState
              startIcon={InboxStackIcon}
              centerIcon={CommandLineIcon}
              endIcon={SparklesIcon}
              title={t(snapshot.threads.length === 0 ? 'sessions.noReadableTitle' : 'sessions.noThreadsTitle')}
              description={t(emptyDescription)}
            />
          )}
    </VStack>
  );
}

function SessionsEmptyState({ source }: { source: string }) {
  const { t } = useI18n();

  return (
    <FeatureEmptyState
      startIcon={SparklesIcon}
      centerIcon={ChatBubbleLeftRightIcon}
      endIcon={InboxStackIcon}
      title={t('sessions.emptyTitle', { source })}
      description={t('sessions.emptyDescription', { source })}
    />
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
  t: (key: TranslationKey, values?: Record<string, string | number>) => string,
): string {
  return t('sessions.filesUnreadable', { count: warning.count ?? 0 });
}
