import type {
  SkillApiErrorCode,
  SkillPackageFileEntry,
  SkillPackageFileKind,
} from '../../../../shared/skill-contract';

export const skillDetailTabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'files', label: 'Files' },
  { value: 'installations', label: 'Installations' },
  { value: 'sources', label: 'Sources' },
] as const;

export type SkillDetailTab = typeof skillDetailTabs[number]['value'];

export interface SkillFileTreeNode {
  id: string;
  label: string;
  entry: SkillPackageFileEntry;
  children?: SkillFileTreeNode[];
}

export function parseSkillDetailTab(value: string): SkillDetailTab {
  return skillDetailTabs.some((tab) => tab.value === value)
    ? value as SkillDetailTab
    : 'overview';
}

export function abbreviateSkillId(value: string, length = 12): string {
  return value.slice(0, length);
}

export function getSkillFileLanguage(relativePath: string): string {
  const extension = relativePath.split('.').pop()?.toLocaleLowerCase();
  const languages: Record<string, string> = {
    css: 'css',
    html: 'html',
    js: 'javascript',
    json: 'json',
    jsx: 'jsx',
    md: 'markdown',
    mjs: 'javascript',
    sh: 'bash',
    ts: 'typescript',
    tsx: 'tsx',
    txt: 'plaintext',
    yaml: 'yaml',
    yml: 'yaml',
  };
  return extension ? languages[extension] ?? 'plaintext' : 'plaintext';
}

export function isSkillFileSelectable(kind: SkillPackageFileKind): boolean {
  return kind !== 'directory';
}

export function getInitialSkillFile(
  entries: readonly SkillPackageFileEntry[],
): string | undefined {
  return entries.find((entry) => (
    entry.relativePath === 'SKILL.md' && entry.kind === 'file'
  ))?.relativePath;
}

export function buildSkillFileTree(
  entries: readonly SkillPackageFileEntry[],
): SkillFileTreeNode[] {
  const nodes = new Map<string, SkillFileTreeNode>();
  for (const entry of entries) {
    nodes.set(entry.relativePath, {
      id: entry.relativePath,
      label: entry.relativePath.split('/').at(-1) ?? entry.relativePath,
      entry,
      ...(entry.kind === 'directory' && { children: [] }),
    });
  }
  const roots: SkillFileTreeNode[] = [];
  for (const entry of entries) {
    const node = nodes.get(entry.relativePath)!;
    const separatorIndex = entry.relativePath.lastIndexOf('/');
    const parentPath = separatorIndex === -1
      ? undefined
      : entry.relativePath.slice(0, separatorIndex);
    const parent = parentPath ? nodes.get(parentPath) : undefined;
    if (parent?.children) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  sortSkillFileNodes(roots);
  return roots;
}

export function shouldExitMissingSkillDetail(
  errorCode: SkillApiErrorCode | undefined,
): boolean {
  return errorCode === 'not-found';
}

export function getEmptySkillTrashDescription(count: number): string {
  return count === 1
    ? '1 Skill Package will be removed from Foundry.'
    : `${count} Skill Packages will be removed from Foundry.`;
}

function sortSkillFileNodes(nodes: SkillFileTreeNode[]): void {
  nodes.sort((left, right) => left.entry.relativePath.localeCompare(
    right.entry.relativePath,
  ));
  for (const node of nodes) {
    if (node.children) {
      sortSkillFileNodes(node.children);
    }
  }
}
