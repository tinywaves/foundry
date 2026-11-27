import { expect, it } from 'vitest';
import { buildThreadTree } from '../features/sessions/thread-tree';
import type { SessionThread } from '../shared/sessions';

function thread(id: string, overrides: Partial<SessionThread> = {}): SessionThread {
  return {
    id,
    title: id,
    subagent: false,
    parentThreadId: null,
    archived: false,
    createdAt: '2026-11-26T00:00:00Z',
    updatedAt: '2026-11-26T00:00:00Z',
    cwd: '/repo',
    gitBranch: null,
    model: null,
    tokensUsed: 0,
    sizeBytes: 0,
    segmentCount: 1,
    ...overrides,
  };
}

it('keeps subagents under their owning session across directories and nesting levels', () => {
  const tree = buildThreadTree([
    thread('child', { subagent: true, parentThreadId: 'parent', cwd: '/other-repo', updatedAt: '2026-11-26T02:00:00Z' }),
    thread('next', { updatedAt: '2026-11-26T01:00:00Z' }),
    thread('parent'),
    thread('grandchild', { subagent: true, parentThreadId: 'child' }),
    thread('older-child', { subagent: true, parentThreadId: 'parent' }),
  ]);
  expect(tree.map((node) => node.id)).toEqual(['next', 'parent']);
  expect(tree[1].children.map((node) => node.id)).toEqual(['child', 'older-child']);
  const [child] = tree[1].children;
  expect(child.children.map((node) => node.id)).toEqual(['grandchild']);
});

it('keeps orphaned subagents visible when the parent is missing or filtered out', () => {
  const tree = buildThreadTree([
    thread('archived-parent', { archived: true }),
    thread('child', { subagent: true, parentThreadId: 'archived-parent' }),
    thread('unknown-parent', { subagent: true }),
  ].filter((session) => !session.archived));
  expect(tree.map((node) => node.id)).toEqual(['child', 'unknown-parent']);
});

it('retains every session when parent metadata contains a cycle', () => {
  const tree = buildThreadTree([
    thread('self', { subagent: true, parentThreadId: 'self' }),
    thread('a', { subagent: true, parentThreadId: 'b' }),
    thread('b', { subagent: true, parentThreadId: 'a' }),
    thread('child', { subagent: true, parentThreadId: 'a' }),
  ]);
  expect(tree.map((node) => node.id)).toEqual(['self', 'a', 'b', 'child']);
});
