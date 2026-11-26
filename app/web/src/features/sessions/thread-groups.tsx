import { useId, useMemo, useState } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import * as stylex from '@stylexjs/stylex';
import type { TranslationKey } from '../../i18n';
import { useI18n } from '../../i18n';
import type { SessionSnapshot } from './types';
import { formatBytes, formatDirectoryParent, formatRelativeTime, formatTokens } from './format';
import { buildThreadTree } from './thread-tree';
import type { ThreadNode } from './thread-tree';

type ThreadGroup = {
  key: string;
  name: string;
  threads: ThreadNode[];
  count: number;
  lastUpdatedAt: string;
};

type FormatUpdatedAt = (value: string) => string;

const styles = stylex.create({
  groups: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    borderWidth: 'var(--border-width)',
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-background-surface)',
    overflow: 'hidden',
  },
  group: {
    minWidth: 0,
    borderBlockEndWidth: {
      'default': 'var(--border-width)',
      ':last-child': 0,
    },
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: 'var(--color-border)',
  },
  heading: {
    margin: 0,
    fontSize: 'inherit',
    fontWeight: 'inherit',
  },
  trigger: {
    'display': 'grid',
    'gridTemplateColumns': '16px minmax(0, 1fr) max-content',
    'alignItems': 'center',
    'gap': 'var(--spacing-3)',
    'width': '100%',
    'minWidth': 0,
    'padding': {
      'default': 'var(--spacing-4)',
      '@media (max-width: 600px)': 'var(--spacing-3)',
    },
    'borderWidth': 0,
    'textAlign': 'start',
    'font': 'inherit',
    'color': 'var(--color-text-primary)',
    'backgroundColor': {
      'default': 'transparent',
      ':hover': 'var(--color-overlay-hover)',
    },
    'cursor': 'pointer',
    ':focus-visible': {
      outline: 'var(--focus-outline-width) solid var(--focus-outline-color)',
      outlineOffset: -2,
    },
  },
  chevron: {
    display: 'flex',
    flexShrink: 0,
    color: 'var(--color-text-secondary)',
  },
  chevronOpen: { transform: 'rotate(90deg)' },
  groupBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-2)',
    minWidth: 0,
    flex: 1,
  },
  directory: {
    display: 'flex',
    alignItems: 'baseline',
    columnGap: 'var(--spacing-3)',
    minWidth: 0,
  },
  groupName: {
    minWidth: 0,
    overflow: 'hidden',
  },
  parentPath: {
    'minWidth': 0,
    'flex': '0 1 auto',
    'overflow': 'hidden',
    '@media (max-width: 600px)': {
      display: 'none',
    },
  },
  preview: { minWidth: 0, maxWidth: '80ch' },
  summary: {
    display: 'grid',
    justifyItems: 'end',
    gap: 'var(--spacing-2)',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
  metadata: {
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: 'var(--spacing-3)',
    rowGap: 'var(--spacing-2)',
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    minWidth: 0,
  },
  item: {
    borderBlockStartWidth: 'var(--border-width)',
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: 'var(--color-border)',
    minWidth: 0,
  },
  row: {
    'display': 'flex',
    'alignItems': {
      'default': 'center',
      '@media (max-width: 600px)': 'flex-start',
    },
    'gap': {
      'default': 'var(--spacing-4)',
      '@media (max-width: 600px)': 'var(--spacing-3)',
    },
    'paddingBlock': {
      'default': 'var(--spacing-4)',
      '@media (max-width: 600px)': 'var(--spacing-3)',
    },
    'paddingInlineStart': {
      'default': 'calc(var(--spacing-4) + 16px + var(--spacing-3))',
      '@media (max-width: 600px)': 'var(--spacing-3)',
    },
    'paddingInlineEnd': {
      'default': 'var(--spacing-4)',
      '@media (max-width: 600px)': 'var(--spacing-3)',
    },
    'backgroundColor': {
      'default': 'transparent',
      ':hover': 'var(--color-background-muted)',
    },
    '@media (max-width: 600px)': {
      flexDirection: 'column',
    },
  },
  threadBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-2)',
    flex: 1,
    minWidth: 0,
    width: '100%',
  },
  title: { overflowWrap: 'anywhere' },
  stats: {
    'display': 'grid',
    'gridTemplateColumns': {
      'default': 'minmax(0, 1fr)',
      '@media (max-width: 600px)': 'auto auto',
    },
    'justifyItems': 'end',
    'alignItems': 'baseline',
    'gap': 'var(--spacing-2)',
    'flexShrink': 0,
    'fontVariantNumeric': 'tabular-nums',
    '@media (max-width: 600px)': {
      columnGap: 'var(--spacing-3)',
    },
  },
  subagents: {
    'marginInlineStart': 'var(--spacing-6)',
    'borderInlineStartWidth': 'var(--border-width)',
    'borderInlineStartStyle': 'solid',
    'borderInlineStartColor': 'var(--color-border)',
    '@media (max-width: 600px)': {
      marginInlineStart: 'var(--spacing-3)',
    },
  },
  subagentTrigger: {
    paddingBlock: 'var(--spacing-3)',
    paddingInline: 'var(--spacing-4)',
    backgroundColor: {
      'default': 'transparent',
      ':hover': 'var(--color-background-muted)',
    },
  },
});

export function ThreadGroups({ snapshot, isShowingArchived, formatUpdatedAt }: {
  snapshot: SessionSnapshot;
  isShowingArchived: boolean;
  formatUpdatedAt: FormatUpdatedAt;
}) {
  const { t } = useI18n();
  const groups = useMemo(
    () => buildGroups(snapshot, isShowingArchived, t),
    [snapshot, isShowingArchived, t],
  );

  return (
    <div {...stylex.props(styles.groups)}>
      {groups.map((group) => (
        <DirectoryGroup key={group.key} group={group} formatUpdatedAt={formatUpdatedAt} />
      ))}
    </div>
  );
}

function DirectoryGroup({ group, formatUpdatedAt }: {
  group: ThreadGroup;
  formatUpdatedAt: FormatUpdatedAt;
}) {
  const { t, locale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const headingId = useId();
  const parentPath = formatDirectoryParent(group.key);

  return (
    <section {...stylex.props(styles.group)} aria-labelledby={headingId}>
      <h2 {...stylex.props(styles.heading)}>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen(!isOpen)}
          {...stylex.props(styles.trigger)}
        >
          <Chevron isOpen={isOpen} />
          <span {...stylex.props(styles.groupBody)}>
            <span {...stylex.props(styles.directory)} title={group.key}>
              <span id={headingId} {...stylex.props(styles.groupName)}>
                <Text weight="semibold" maxLines={1}>{group.name}</Text>
              </span>
              <span {...stylex.props(styles.parentPath)}>
                <Text color="secondary" maxLines={1}>{parentPath}</Text>
              </span>
            </span>
            <span {...stylex.props(styles.preview)}>
              <Text color="secondary" maxLines={1}>{group.threads[0]?.title}</Text>
            </span>
          </span>
          <span {...stylex.props(styles.summary)}>
            <span title={formatUpdatedAt(group.lastUpdatedAt)}>
              <Text color="secondary">{formatRelativeTime(group.lastUpdatedAt, locale)}</Text>
            </span>
            <Text color="secondary">{t('sessions.sessionCount', { count: group.count })}</Text>
          </span>
        </button>
      </h2>
      <div id={panelId} hidden={!isOpen}>
        {isOpen && <ThreadList threads={group.threads} formatUpdatedAt={formatUpdatedAt} />}
      </div>
    </section>
  );
}

function ThreadList({ threads, formatUpdatedAt }: {
  threads: ThreadNode[];
  formatUpdatedAt: FormatUpdatedAt;
}) {
  const { t, locale } = useI18n();
  return (
    <ul {...stylex.props(styles.list)}>
      {threads.map((thread) => (
        <li key={thread.id} {...stylex.props(styles.item)}>
          <div {...stylex.props(styles.row)}>
            <div {...stylex.props(styles.threadBody)}>
              <div title={thread.title} {...stylex.props(styles.title)}>
                <Text maxLines={2}>{thread.title}</Text>
              </div>
              <div {...stylex.props(styles.metadata)}>
                <span title={formatUpdatedAt(thread.updatedAt)}>
                  <Text type="supporting">{formatRelativeTime(thread.updatedAt, locale)}</Text>
                </span>
                {thread.model && <Text type="supporting">{thread.model}</Text>}
                {thread.gitBranch && <Text type="supporting">{thread.gitBranch}</Text>}
                {thread.subagent && <Text type="supporting">{t('sessions.subagent')}</Text>}
                {thread.archived && <Text type="supporting">{t('sessions.archived')}</Text>}
              </div>
            </div>
            <div {...stylex.props(styles.stats)}>
              <Text weight="semibold">
                {formatTokens(thread.tokensUsed)}
                {' '}
                {t('sessions.tokens')}
              </Text>
              <Text type="supporting">{formatBytes(thread.sizeBytes)}</Text>
            </div>
          </div>
          {thread.children.length > 0 && (
            <SubagentSection threads={thread.children} formatUpdatedAt={formatUpdatedAt} />
          )}
        </li>
      ))}
    </ul>
  );
}

function SubagentSection({ threads, formatUpdatedAt }: {
  threads: ThreadNode[];
  formatUpdatedAt: FormatUpdatedAt;
}) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  return (
    <div {...stylex.props(styles.subagents)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
        {...stylex.props(styles.trigger, styles.subagentTrigger)}
      >
        <Chevron isOpen={isOpen} />
        <Text type="supporting">{`${t('sessions.subagents')} (${threads.length})`}</Text>
      </button>
      <div id={panelId} hidden={!isOpen}>
        {isOpen && <ThreadList threads={threads} formatUpdatedAt={formatUpdatedAt} />}
      </div>
    </div>
  );
}

function Chevron({ isOpen }: { isOpen: boolean }) {
  return (
    <span aria-hidden="true" {...stylex.props(styles.chevron, isOpen && styles.chevronOpen)}>
      <Icon icon={ChevronRightIcon} size="sm" />
    </span>
  );
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
        threads: [],
        count: 0,
        lastUpdatedAt: thread.updatedAt,
      };
      groups.set(key, group);
    }

    group.threads.push(thread);
    const descendants = [thread];
    while (descendants.length > 0) {
      const descendant = descendants.pop()!;
      group.count += 1;
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
