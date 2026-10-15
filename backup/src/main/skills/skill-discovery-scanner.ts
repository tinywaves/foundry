import { Buffer } from 'node:buffer';
import type { Dirent } from 'node:fs';
import { readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  SKILL_DISCOVERY_MAX_DIRECTORIES,
  SKILL_TARGET_MAX_SCAN_DEPTH,
} from '../../shared/skill-contract';
import type { SkillTargetRootExclusion } from './skill-target-adapters';

export interface SkillTargetScanInput {
  targetId: string;
  rootPath: string;
  maxScanDepth: number;
  allowSymlinkEscape: boolean;
  excludedRootEntries: readonly SkillTargetRootExclusion[];
}

export interface DiscoveredSkillCandidate {
  relativePath: string;
  packagePath: string;
  contentPath: string;
}

export interface SkillScanWarning {
  code: 'entry-unreadable' | 'symlink-escape-blocked' | 'traversal-limit-reached';
  relativePath: string | null;
}

export interface SkillTargetScanResult {
  targetId: string;
  rootPath: string;
  rootStatus: 'scanned' | 'missing' | 'unreadable';
  candidates: DiscoveredSkillCandidate[];
  warnings: SkillScanWarning[];
  directoriesInspected: number;
  truncated: boolean;
}

interface ScanQueueEntry {
  visiblePath: string;
  contentPath: string;
  resolvedPath: string;
  relativePath: string;
  depth: number;
}

export async function scanSkillTarget(
  input: SkillTargetScanInput,
  maximumDirectories = SKILL_DISCOVERY_MAX_DIRECTORIES,
): Promise<SkillTargetScanResult> {
  if (
    !path.isAbsolute(input.rootPath)
    || !Number.isSafeInteger(input.maxScanDepth)
    || input.maxScanDepth < 1
    || input.maxScanDepth > SKILL_TARGET_MAX_SCAN_DEPTH
    || !Number.isSafeInteger(maximumDirectories)
    || maximumDirectories < 1
    || maximumDirectories > SKILL_DISCOVERY_MAX_DIRECTORIES
  ) {
    throw new Error('Skill Target scan input is invalid.');
  }

  let resolvedRoot: string;
  try {
    const rootStats = await stat(input.rootPath);
    if (!rootStats.isDirectory()) {
      return unavailableResult(input, 'unreadable');
    }
    resolvedRoot = await realpath(input.rootPath);
  } catch (error) {
    return unavailableResult(input, hasFilesystemCode(error, 'ENOENT') ? 'missing' : 'unreadable');
  }

  const candidates: DiscoveredSkillCandidate[] = [];
  const warnings: SkillScanWarning[] = [];
  const queue: ScanQueueEntry[] = [
    {
      visiblePath: input.rootPath,
      contentPath: resolvedRoot,
      resolvedPath: resolvedRoot,
      relativePath: '',
      depth: 0,
    },
  ];
  const visited = new Set<string>();
  let directoriesInspected = 0;
  let isTruncated = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.resolvedPath)) {
      continue;
    }
    if (directoriesInspected >= maximumDirectories) {
      isTruncated = true;
      warnings.push({ code: 'traversal-limit-reached', relativePath: null });
      break;
    }
    visited.add(current.resolvedPath);
    directoriesInspected += 1;

    let entries;
    try {
      entries = await readdir(current.contentPath, { withFileTypes: true });
    } catch {
      warnings.push({
        code: 'entry-unreadable',
        relativePath: current.relativePath || null,
      });
      continue;
    }
    if (current.depth > 0 && entries.some((entry) => entry.name === 'SKILL.md')) {
      candidates.push({
        relativePath: current.relativePath,
        packagePath: current.visiblePath,
        contentPath: current.resolvedPath,
      });
      continue;
    }
    if (current.depth >= input.maxScanDepth) {
      continue;
    }

    for (const entry of entries) {
      await enqueueDirectoryEntry(input, current, entry, resolvedRoot, warnings, queue);
    }
  }

  candidates.sort((left, right) => Buffer.compare(
    Buffer.from(left.relativePath),
    Buffer.from(right.relativePath),
  ));
  return {
    targetId: input.targetId,
    rootPath: input.rootPath,
    rootStatus: 'scanned',
    candidates,
    warnings,
    directoriesInspected,
    truncated: isTruncated,
  };
}

function unavailableResult(
  input: SkillTargetScanInput,
  rootStatus: 'missing' | 'unreadable',
): SkillTargetScanResult {
  return {
    targetId: input.targetId,
    rootPath: input.rootPath,
    rootStatus,
    candidates: [],
    warnings: [],
    directoriesInspected: 0,
    truncated: false,
  };
}

async function enqueueDirectoryEntry(
  input: SkillTargetScanInput,
  current: ScanQueueEntry,
  entry: Dirent,
  resolvedRoot: string,
  warnings: SkillScanWarning[],
  queue: ScanQueueEntry[],
): Promise<void> {
  if (
    current.depth === 0
    && input.excludedRootEntries.some((exclusion) => isExcludedEntry(entry.name, exclusion))
  ) {
    return;
  }
  if (!entry.isDirectory() && !entry.isSymbolicLink()) {
    return;
  }
  const relativePath = current.relativePath
    ? `${current.relativePath}/${entry.name}`
    : entry.name;
  const visiblePath = path.join(current.visiblePath, entry.name);
  try {
    const resolvedPath = await realpath(visiblePath);
    const entryStats = await stat(resolvedPath);
    if (!entryStats.isDirectory()) {
      return;
    }
    if (!input.allowSymlinkEscape && !isContainedPath(resolvedRoot, resolvedPath)) {
      warnings.push({ code: 'symlink-escape-blocked', relativePath });
      return;
    }
    queue.push({
      visiblePath,
      contentPath: resolvedPath,
      resolvedPath,
      relativePath,
      depth: current.depth + 1,
    });
  } catch {
    warnings.push({ code: 'entry-unreadable', relativePath });
  }
}

function isExcludedEntry(name: string, exclusion: SkillTargetRootExclusion): boolean {
  return exclusion.caseSensitive
    ? name === exclusion.name
    : name.toLowerCase() === exclusion.name.toLowerCase();
}

function isContainedPath(rootPath: string, candidatePath: string): boolean {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === ''
    || (!path.isAbsolute(relativePath)
      && relativePath !== '..'
      && !relativePath.startsWith(`..${path.sep}`));
}

function hasFilesystemCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
}
