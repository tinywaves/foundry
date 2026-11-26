import { useMemo, useState } from 'react';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import {
  Table,
  pixel,
  proportional,
  useTableGroupedRows,
  useTableStickyColumns,
} from '@astryxdesign/core/Table';
import type { TableColumn, TablePlugin } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import * as stylex from '@stylexjs/stylex';
import type { TranslationKey } from '../../i18n';
import { useI18n } from '../../i18n';
import type {
  SessionSnapshot,
  SessionThread,
} from './types';
import { formatBytes, formatTokens } from './format';
import { buildThreadTree } from './thread-tree';
import type { ThreadNode } from './thread-tree';
import { subagentPanelMarker } from './thread-table.stylex';

type ThreadGroup = {
  key: string;
  name: string;
  roots: string[];
  threads: ThreadNode[];
  count: number;
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
  subagentCell: {
    padding: 0,
    borderBottomWidth: {
      default: 'var(--border-width)',
      [stylex.when.ancestor(':last-child', subagentPanelMarker)]: 0,
    },
    borderBottomStyle: 'solid',
    borderBottomColor: 'var(--color-border)',
  },
  subagentContent: {
    // Nested tables own their inset; inheriting the page's bleed creates
    // overflow that switches the outer scroll container and shifts sticky cells.
    '--container-padding-inline-start': '0px',
    '--container-padding-inline-end': '0px',
    '--container-padding-block-start': '0px',
    '--container-padding-block-end': '0px',
    'paddingBlockStart': 'var(--spacing-2)',
  },
  subagentSection: {
    'paddingInlineStart': 'var(--spacing-6)',
    'paddingInlineEnd': 'var(--spacing-2)',
    'paddingBlock': 'var(--spacing-2)',
    '@media (max-width: 600px)': {
      paddingInlineStart: 'var(--spacing-2)',
    },
  },
});

const subagentHeaders: TablePlugin<ThreadNode> = {
  transformHeaderCell: (props) => ({
    ...props,
    content: <VisuallyHidden>{props.content}</VisuallyHidden>,
    htmlProps: {
      ...props.htmlProps,
      style: { ...props.htmlProps.style, paddingBlock: 0, height: 0, borderBottomWidth: 0 },
    },
  }),
};

export function ThreadTable({
  snapshot,
  isShowingArchived,
  formatUpdatedAt,
}: {
  snapshot: SessionSnapshot;
  isShowingArchived: boolean;
  formatUpdatedAt: (value: string) => string;
}) {
  type ThreadRow = ThreadNode & { groupKey: string };
  const { t } = useI18n();
  const groups = useMemo(
    () => buildGroups(snapshot, isShowingArchived, t),
    [snapshot, isShowingArchived, t],
  );
  const groupsByKey = useMemo(
    () => new Map(groups.map((group) => [group.key, group])),
    [groups],
  );
  const rows = useMemo(
    () => groups.flatMap((group) => group.threads.map((thread) => ({
      ...thread,
      groupKey: group.key,
    }))),
    [groups],
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
    renderGroupHeader: (groupKey) => {
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
            {t('sessions.sessionCount', { count: group.count })}
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
  const columns = useThreadColumns<ThreadRow>(formatUpdatedAt);
  const subagents = useSubagentRows(columns, formatUpdatedAt);

  return (
    <Table<ThreadRow>
      data={groupedRows.data}
      columns={columns}
      idKey={groupedRows.idKey}
      hasHover
      plugins={{
        groupedRows: groupedRows.plugin,
        stickyColumns,
        subagents,
      }}
    />
  );
}

function useThreadColumns<T extends ThreadNode = ThreadNode>(formatUpdatedAt: (value: string) => string) {
  const { t } = useI18n();
  return useMemo<Array<TableColumn<T>>>(() => [
    {
      key: 'thread',
      header: t('sessions.thread'),
      width: proportional(4, { minWidth: 240 }),
      renderCell: (thread) => (
        <VStack gap={0} xstyle={styles.title}>
          <Text maxLines={1}>{thread.title}</Text>
          {secondaryLine(thread, t) && (
            <Text type="supporting" maxLines={1}>
              {secondaryLine(thread, t)}
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
}

function SubagentSection({ threads, formatUpdatedAt }: {
  threads: ThreadNode[];
  formatUpdatedAt: (value: string) => string;
}) {
  const { t } = useI18n();
  const columns = useThreadColumns(formatUpdatedAt);
  const subagents = useSubagentRows(columns, formatUpdatedAt);
  return (
    <Collapsible
      trigger={(
        <Text type="supporting">
          {t('sessions.subagents')}
          {' '}
          (
          {threads.length}
          )
        </Text>
      )}
      defaultIsOpen={false}
      chevronPosition="start"
      xstyle={styles.subagentSection}
    >
      <div {...stylex.props(styles.subagentContent)}>
        <Table<ThreadNode>
          data={threads}
          columns={columns}
          idKey="id"
          hasHover
          plugins={{ subagentHeaders, subagents }}
        />
      </div>
    </Collapsible>
  );
}

function useSubagentRows<T extends ThreadNode>(
  columns: Array<TableColumn<T>>,
  formatUpdatedAt: (value: string) => string,
): TablePlugin<T> {
  return useMemo(() => ({
    transformBodyCell: (props, _column, thread) => !('children' in thread) || thread.children.length === 0
      ? props
      : {
          ...props,
          htmlProps: {
            ...props.htmlProps,
            style: { ...props.htmlProps.style, borderBottomWidth: 0 },
          },
        },
    transformBodyRow: (props, thread) => {
      if (!('children' in thread) || thread.children.length === 0) {
        return props;
      }
      return {
        ...props,
        afterRow: (
          <>
            {props.afterRow}
            <tr data-expansion-panel="" {...stylex.props(subagentPanelMarker)}>
              <td colSpan={columns.length} {...stylex.props(styles.subagentCell)}>
                <SubagentSection threads={thread.children} formatUpdatedAt={formatUpdatedAt} />
              </td>
            </tr>
          </>
        ),
      };
    },
  }), [columns, formatUpdatedAt]);
}

function buildGroups(
  snapshot: SessionSnapshot,
  isShowingArchived: boolean,
  t: (key: TranslationKey) => string,
): ThreadGroup[] {
  const groups = new Map<string, ThreadGroup>();

  const visibleThreads = snapshot.threads.filter((thread) => isShowingArchived || !thread.archived);
  for (const thread of buildThreadTree(visibleThreads)) {
    const key = thread.cwd;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: thread.cwd.split(/[\\/]/u).findLast(Boolean) || thread.cwd || t('sessions.unknownDirectory'),
        roots: thread.cwd ? [thread.cwd] : [],
        threads: [],
        count: 0,
        totalBytes: 0,
        lastUpdatedAt: thread.updatedAt,
      };
      groups.set(key, group);
    }

    group.threads.push(thread);
    const descendants = [thread];
    while (descendants.length > 0) {
      const descendant = descendants.pop()!;
      group.count += 1;
      group.totalBytes += descendant.sizeBytes;
      if (descendant.updatedAt > group.lastUpdatedAt) {
        group.lastUpdatedAt = descendant.updatedAt;
      }
      descendants.push(...descendant.children);
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
