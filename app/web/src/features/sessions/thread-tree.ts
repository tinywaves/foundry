import type { SessionThread } from './types';

export type ThreadNode = SessionThread & { children: ThreadNode[] };

export function buildThreadTree(threads: SessionThread[]): ThreadNode[] {
  const nodes = new Map<string, ThreadNode>(threads.map((thread) => [thread.id, { ...thread, children: [] }]));
  const roots: ThreadNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.subagent && node.parentThreadId ? nodes.get(node.parentThreadId) : undefined;
    // Missing parents and malformed cycles must never hide sessions or recurse forever.
    const ancestors = new Set([node.id]);
    let ancestor = parent;
    while (ancestor && !ancestors.has(ancestor.id)) {
      ancestors.add(ancestor.id);
      ancestor = ancestor.subagent && ancestor.parentThreadId ? nodes.get(ancestor.parentThreadId) : undefined;
    }
    if (parent && !ancestor) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sort = (siblings: ThreadNode[]): ThreadNode[] => siblings
    .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((node) => ({ ...node, children: sort(node.children) }));
  return sort(roots);
}
