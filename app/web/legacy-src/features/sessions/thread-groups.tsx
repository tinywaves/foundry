import { IconGlyph } from '@/components/workbench';
import { cn } from '@/lib/utils';
import { useId, useMemo, useState } from 'react';
import { ChevronRight as ChevronRightIcon } from 'lucide-react';
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
export function ThreadGroups({ snapshot, isShowingArchived, formatUpdatedAt }: {
  snapshot: SessionSnapshot;
  isShowingArchived: boolean;
  formatUpdatedAt: FormatUpdatedAt;
}) {
  const { t } = useI18n();
  const groups = useMemo(() => buildGroups(snapshot, isShowingArchived, t), [snapshot, isShowingArchived, t]);
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
      {groups.map((group) => (<DirectoryGroup key={group.key} group={group} formatUpdatedAt={formatUpdatedAt} />))}
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
    <section aria-labelledby={headingId} className="min-w-0 border-b last:border-b-0">
      <h2 className="m-0 text-inherit font-normal">
        <button type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setIsOpen(!isOpen)} className="grid w-full min-w-0 grid-cols-[16px_minmax(0,1fr)_max-content] items-center gap-3 p-4 text-start hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 max-[600px]:p-3">
          <Chevron isOpen={isOpen} />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span title={group.key} className="flex min-w-0 items-baseline gap-x-3">
              <span id={headingId} className="min-w-0 overflow-hidden">
                <span className="font-semibold truncate">{group.name}</span>
              </span>
              <span className="min-w-0 shrink overflow-hidden max-[600px]:hidden">
                <span className="text-muted-foreground truncate">{parentPath}</span>
              </span>
            </span>
            <span className="min-w-0 max-w-[80ch]">
              <span className="text-muted-foreground truncate">{group.threads[0]?.title}</span>
            </span>
          </span>
          <span className="grid justify-items-end gap-2 whitespace-nowrap tabular-nums">
            <span title={formatUpdatedAt(group.lastUpdatedAt)}>
              <span className="text-muted-foreground">{formatRelativeTime(group.lastUpdatedAt, locale)}</span>
            </span>
            <span className="text-muted-foreground">{t('sessions.sessionCount', { count: group.count })}</span>
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
    <ul className="m-0 min-w-0 list-none p-0">
      {threads.map((thread) => (
        <li key={thread.id} className="min-w-0 border-t">
          <div className="flex items-center gap-4 py-4 pr-4 pl-11 hover:bg-muted max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-3 max-[600px]:p-3">
            <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
              <div title={thread.title} className="wrap-anywhere">
                <span className="line-clamp-2">{thread.title}</span>
              </div>
              <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-2 wrap-anywhere">
                <span title={formatUpdatedAt(thread.updatedAt)}>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(thread.updatedAt, locale)}</span>
                </span>
                {thread.model && <span className="text-xs text-muted-foreground">{thread.model}</span>}
                {thread.gitBranch && <span className="text-xs text-muted-foreground">{thread.gitBranch}</span>}
                {thread.subagent && <span className="text-xs text-muted-foreground">{t('sessions.subagent')}</span>}
                {thread.archived && <span className="text-xs text-muted-foreground">{t('sessions.archived')}</span>}
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-1 items-baseline justify-items-end gap-2 tabular-nums max-[600px]:grid-cols-[auto_auto] max-[600px]:gap-x-3">
              <span className="font-semibold">
                {formatTokens(thread.tokensUsed)}
                {' '}
                {t('sessions.tokens')}
              </span>
              <span className="text-xs text-muted-foreground">{formatBytes(thread.sizeBytes)}</span>
            </div>
          </div>
          {thread.children.length > 0 && (<SubagentSection threads={thread.children} formatUpdatedAt={formatUpdatedAt} />)}
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
    <div className="ml-6 border-l max-[600px]:ml-3">
      <button type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setIsOpen(!isOpen)} className="grid w-full min-w-0 grid-cols-[16px_minmax(0,1fr)_max-content] items-center gap-3 p-4 text-start hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 max-[600px]:p-3 px-4 py-3">
        <Chevron isOpen={isOpen} />
        <span className="text-xs text-muted-foreground">{`${t('sessions.subagents')} (${threads.length})`}</span>
      </button>
      <div id={panelId} hidden={!isOpen}>
        {isOpen && <ThreadList threads={threads} formatUpdatedAt={formatUpdatedAt} />}
      </div>
    </div>
  );
}
function Chevron({ isOpen }: {
  isOpen: boolean;
}) {
  return (
    <span aria-hidden="true" className={cn('flex shrink-0 text-muted-foreground', isOpen && 'rotate-90')}>
      <IconGlyph icon={ChevronRightIcon} className="size-4 shrink-0" />
    </span>
  );
}
function buildGroups(snapshot: SessionSnapshot, isShowingArchived: boolean, t: (key: TranslationKey) => string): ThreadGroup[] {
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
  const grouped = Array.from(groups.values(), (group): ThreadGroup => ({
    ...group,
    threads: group.threads.toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  }));
  return grouped.toSorted((left, right) => (right.lastUpdatedAt.localeCompare(left.lastUpdatedAt)
    || left.name.localeCompare(right.name)));
}
