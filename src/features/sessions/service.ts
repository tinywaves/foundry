import { statSync } from 'node:fs';
import type {
  CodexSessionSnapshot,
  SessionThread,
  SessionThreadBucket,
} from './contracts';
import { resolveCodexHomePath } from './codex-home';
import {
  findCodexStateDatabase,
  indexCodexRolloutFiles,
  readCodexProjects,
  readCodexThreads,
} from './codex-repository';
import type { CodexThreadRecord, RolloutFileUsage } from './codex-repository';

export class SessionService {
  constructor(
    private readonly codexHome = resolveCodexHomePath(),
  ) {}

  getCodexSnapshot(): CodexSessionSnapshot {
    const databasePath = findCodexStateDatabase(this.codexHome);
    const threadRecords = readCodexThreads(databasePath);
    const projectState = readCodexProjects(this.codexHome);
    const rolloutFiles = indexCodexRolloutFiles(this.codexHome);
    const projectsById = new Map(
      projectState.projects.map((project) => [project.id, project]),
    );

    const threads = threadRecords
      .map((thread) => toSessionThread(thread, projectState, projectsById, rolloutFiles.files))
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return {
      source: 'codex',
      capturedAt: new Date().toISOString(),
      projects: projectState.projects,
      threads,
      warnings: [
        ...projectState.warnings,
        ...(rolloutFiles.unreadable > 0
          ? [
              {
                code: 'ROLLOUT_FILES_UNREADABLE' as const,
                count: rolloutFiles.unreadable,
              },
            ]
          : []),
      ],
    };
  }
}

function toSessionThread(
  thread: CodexThreadRecord,
  projectState: ReturnType<typeof readCodexProjects>,
  projectsById: Map<string, { id: string; name: string; roots: string[] }>,
  rolloutFiles: Map<string, RolloutFileUsage>,
): SessionThread {
  const assignedProjectId = projectState.assignments.get(thread.id);
  const project = assignedProjectId ? projectsById.get(assignedProjectId) : undefined;
  const projectBucket: SessionThreadBucket = project
    ? 'assigned'
    : (projectState.projectless.has(thread.id)
        ? 'projectless'
        : 'unassigned');
  const rolloutUsage = rolloutFiles.get(thread.id)
    ?? fallbackRolloutUsage(thread.rolloutPath);
  const updatedAtMs = thread.updatedAtMs > 0 ? thread.updatedAtMs : thread.createdAtMs;
  const createdAtMs = thread.createdAtMs > 0 ? thread.createdAtMs : updatedAtMs;

  return {
    id: thread.id,
    title: threadTitle(thread),
    projectId: project?.id ?? null,
    projectBucket,
    archived: thread.archived,
    subagent: isSubagentSource(thread.source),
    createdAt: new Date(createdAtMs).toISOString(),
    updatedAt: new Date(updatedAtMs).toISOString(),
    sizeBytes: rolloutUsage?.bytes ?? 0,
    segmentCount: rolloutUsage?.segments ?? 0,
    tokensUsed: Math.max(0, Math.trunc(thread.tokensUsed)),
    model: thread.model ?? thread.modelProvider,
    cwd: thread.cwd,
    gitBranch: thread.gitBranch,
  };
}

function threadTitle(thread: CodexThreadRecord): string {
  return firstNonEmpty([
    thread.name,
    thread.title,
    thread.firstUserMessage,
    thread.preview,
    thread.id.slice(0, 8),
  ]);
}

function firstNonEmpty(values: Array<string | null>): string {
  for (const value of values) {
    const normalized = (value ?? '').replaceAll(/\s+/gu, ' ').trim();
    if (normalized.length > 0) {
      return normalized.slice(0, 240);
    }
  }
  return '';
}

function fallbackRolloutUsage(rolloutPath: string | null): RolloutFileUsage | null {
  if (!rolloutPath) {
    return null;
  }
  for (const candidate of [rolloutPath, `${rolloutPath}.zst`]) {
    try {
      return { bytes: statSync(candidate).size, segments: 1 };
    } catch {
      // Try the compressed or uncompressed sibling.
    }
  }
  return null;
}

function isSubagentSource(source: string): boolean {
  const trimmed = source.trim();
  if (!trimmed.startsWith('{')) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return typeof parsed === 'object'
      && parsed !== null
      && !Array.isArray(parsed)
      && 'subagent' in parsed;
  } catch {
    return trimmed.includes('"subagent"');
  }
}
