import { useMemo, useState } from 'react';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import {
  Table,
  pixel,
  proportional,
  useTableGroupedRows,
  useTableStickyColumns,
} from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import * as stylex from '@stylexjs/stylex';
import type { TranslationKey } from '../../i18n';
import { useI18n } from '../../i18n';
import type {
  SessionSnapshot,
  SessionThread,
} from './types';
import { formatBytes, formatTokens } from './format';

type ThreadGroup = {
  key: string;
  name: string;
  roots: string[];
  threads: SessionThread[];
  totalBytes: number;
  lastUpdatedAt: string;
};

const styles = stylex.create({
  groupHeader: {
    width: '100%',
    minWidth: 0,
    flexWrap: 'wrap',
    rowGap: 'var(--spacing-1)',
  },
  groupName: {
    minWidth: 0,
    flexShrink: 1,
  },
  title: {
    minWidth: 0,
  },
});

export function ThreadTable({
  snapshot,
  isShowingArchived,
  isShowingSubagents,
  formatUpdatedAt,
}: {
  snapshot: SessionSnapshot;
  isShowingArchived: boolean;
  isShowingSubagents: boolean;
  formatUpdatedAt: (value: string) => string;
}) {
  type ThreadRow = SessionThread & {
    groupKey: string;
    secondary: string;
  };
  const { t } = useI18n();
  const groups = useMemo(
    () => buildGroups(snapshot, isShowingArchived, isShowingSubagents, t),
    [snapshot, isShowingArchived, isShowingSubagents, t],
  );
  const groupsByKey = useMemo(
    () => new Map(groups.map((group) => [group.key, group])),
    [groups],
  );
  const rows = useMemo<ThreadRow[]>(
    () => groups.flatMap((group) => group.threads.map((thread) => ({
      ...thread,
      groupKey: group.key,
      secondary: secondaryLine(thread, t),
    }))),
    [groups, t],
  );

  const defaultCollapsedGroups = useMemo(
    () => new Set(groups.map((group) => group.key)),
    [groups],
  );
  const [groupOverrides, setGroupOverrides] = useState<Map<string, boolean>>(
    () => new Map(),
  );
  const collapsedGroups = useMemo(() => {
    const next = new Set(defaultCollapsedGroups);
    for (const [groupKey, isCollapsed] of groupOverrides) {
      if (isCollapsed) {
        next.add(groupKey);
      } else {
        next.delete(groupKey);
      }
    }
    return next;
  }, [defaultCollapsedGroups, groupOverrides]);

  const groupedRows = useTableGroupedRows<ThreadRow>({
    data: rows,
    groupBy: (row) => row.groupKey,
    collapsedGroups,
    onToggleGroup: (groupKey) => {
      setGroupOverrides((current) => {
        const next = new Map(current);
        next.set(groupKey, !collapsedGroups.has(groupKey));
        return next;
      });
    },
    renderGroupHeader: (groupKey, count) => {
      const group = groupsByKey.get(groupKey);
      if (!group) {
        return null;
      }
      const roots = group.roots.length > 0 ? group.roots.join('\n') : undefined;
      return (
        <HStack gap={3} vAlign="center" xstyle={styles.groupHeader}>
          <span title={roots} {...stylex.props(styles.groupName)}>
            <Text weight="semibold" maxLines={1}>
              {group.name}
            </Text>
          </span>
          <Text type="supporting">
            {t('sessions.sessionCount', { count })}
          </Text>
          <StackItem size="fill" />
          <Text type="supporting">{formatBytes(group.totalBytes)}</Text>
          <Text type="supporting">{formatUpdatedAt(group.lastUpdatedAt)}</Text>
        </HStack>
      );
    },
    getRowKey: (row) => row.id,
    groupOrder: groups.map((group) => group.key),
  });
  const stickyColumns = useTableStickyColumns<ThreadRow>({
    startKeys: ['thread'],
  });

  const columns = useMemo<Array<TableColumn<ThreadRow>>>(() => [
    {
      key: 'thread',
      header: t('sessions.thread'),
      width: proportional(4, { minWidth: 240 }),
      renderCell: (thread) => (
        <VStack gap={0} xstyle={styles.title}>
          <Text maxLines={1}>{thread.title}</Text>
          {thread.secondary && (
            <Text type="supporting" maxLines={1}>
              {thread.secondary}
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: 'updated',
      header: t('sessions.updated'),
      width: pixel(190),
      align: 'end',
      renderCell: (thread) => (
        <Text color="secondary" maxLines={1}>
          {formatUpdatedAt(thread.updatedAt)}
        </Text>
      ),
    },
    {
      key: 'size',
      header: t('sessions.size'),
      width: pixel(144),
      align: 'end',
      renderCell: (thread) => (
        <Text color="secondary">{formatBytes(thread.sizeBytes)}</Text>
      ),
    },
    {
      key: 'tokens',
      header: t('sessions.tokens'),
      width: pixel(100),
      align: 'end',
      renderCell: (thread) => (
        <Text color="secondary">{formatTokens(thread.tokensUsed)}</Text>
      ),
    },
    {
      key: 'model',
      header: t('sessions.model'),
      width: proportional(2, { minWidth: 140 }),
      renderCell: (thread) => (
        <Text maxLines={1}>{thread.model ?? ''}</Text>
      ),
    },
  ], [formatUpdatedAt, t]);

  return (
    <Table<ThreadRow>
      data={groupedRows.data}
      columns={columns}
      idKey={groupedRows.idKey}
      hasHover
      plugins={{
        groupedRows: groupedRows.plugin,
        stickyColumns,
      }}
    />
  );
}

function buildGroups(
  snapshot: SessionSnapshot,
  isShowingArchived: boolean,
  isShowingSubagents: boolean,
  t: (key: TranslationKey) => string,
): ThreadGroup[] {
  const groups = new Map<string, ThreadGroup>();

  for (const thread of snapshot.threads) {
    if (!isShowingArchived && thread.archived) {
      continue;
    }
    if (!isShowingSubagents && thread.subagent) {
      continue;
    }

    const key = thread.cwd;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: thread.cwd.split(/[\\/]/u).findLast(Boolean) || thread.cwd || t('sessions.unknownDirectory'),
        roots: thread.cwd ? [thread.cwd] : [],
        threads: [],
        totalBytes: 0,
        lastUpdatedAt: thread.updatedAt,
      };
      groups.set(key, group);
    }

    group.threads.push(thread);
    group.totalBytes += thread.sizeBytes;
    if (thread.updatedAt > group.lastUpdatedAt) {
      group.lastUpdatedAt = thread.updatedAt;
    }
  }

  const grouped = Array.from(
    groups.values(),
    (group): ThreadGroup => ({
      ...group,
      threads: group.threads.toSorted(
        (left, right) => right.updatedAt.localeCompare(left.updatedAt),
      ),
    }),
  );
  return grouped.toSorted((left, right) => (
    right.lastUpdatedAt.localeCompare(left.lastUpdatedAt)
    || left.name.localeCompare(right.name)
  ));
}

function secondaryLine(
  thread: SessionThread,
  t: (key: TranslationKey) => string,
): string {
  const parts: string[] = [];
  if (thread.gitBranch) {
    parts.push(thread.gitBranch);
  }
  if (thread.cwd) {
    const folder = thread.cwd.split(/[\\/]/u).findLast(Boolean);
    if (folder) {
      parts.push(folder);
    }
  }
  if (thread.subagent) {
    parts.push(t('sessions.subagent'));
  }
  if (thread.archived) {
    parts.push(t('sessions.archived'));
  }
  return parts.join(' · ');
}
