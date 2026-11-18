import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type {
  SessionProject,
  SessionWarning,
} from './contracts';
import { SessionSourceError } from './contracts';

const ROLLOUT_FILE_PATTERN
  = /^rollout-\d{4}-\d{2}-\d{2}T[\d-]+-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:_[0-9a-f-]{36})?\.jsonl(?:\.zst)?$/u;

export interface CodexThreadRecord {
  id: string;
  title: string;
  name: string | null;
  firstUserMessage: string | null;
  preview: string | null;
  cwd: string;
  updatedAtMs: number;
  createdAtMs: number;
  archived: boolean;
  source: string;
  model: string | null;
  modelProvider: string | null;
  tokensUsed: number;
  rolloutPath: string | null;
  gitBranch: string | null;
}

export interface CodexProjectState {
  projects: SessionProject[];
  assignments: Map<string, string>;
  projectless: Set<string>;
  warnings: SessionWarning[];
}

export interface RolloutFileUsage {
  bytes: number;
  segments: number;
}

export interface RolloutFileIndex {
  files: Map<string, RolloutFileUsage>;
  unreadable: number;
}

export function findCodexStateDatabase(codexHome: string): string {
  const candidates = stateDatabaseCandidates(codexHome);
  if (candidates.length === 0) {
    throw new SessionSourceError(
      'CODEX_DATA_NOT_FOUND',
      'Codex state database was not found',
    );
  }

  const valid: Array<{ path: string; modifiedAt: number }> = [];
  for (const candidate of candidates) {
    let client: Database.Database | null = null;
    try {
      client = openReadonly(candidate);
      if (hasTable(client, 'threads')) {
        valid.push({
          path: candidate,
          modifiedAt: statSync(candidate).mtimeMs,
        });
      }
    } catch {
      // Try the other state files; a stale or locked copy should not hide the active one.
    } finally {
      client?.close();
    }
  }

  if (valid.length === 0) {
    throw new SessionSourceError(
      'UNSUPPORTED_CODEX_SCHEMA',
      'Codex state database does not contain a supported threads table',
    );
  }

  return valid.toSorted((left, right) => right.modifiedAt - left.modifiedAt)[0].path;
}

export function readCodexThreads(databasePath: string): CodexThreadRecord[] {
  const client = openReadonly(databasePath);
  try {
    const columns = new Set(
      (client.prepare('PRAGMA table_info(threads)').all() as Array<{ name: string }>)
        .map((column) => column.name),
    );
    if (!columns.has('id') || !columns.has('updated_at')) {
      throw new SessionSourceError(
        'UNSUPPORTED_CODEX_SCHEMA',
        'Codex threads table is missing required columns',
      );
    }

    const field = (name: string, fallback = 'NULL') =>
      columns.has(name) ? `"${name}"` : fallback;
    const query = `SELECT ${[
      `${field('id')} AS id`,
      `${field('title', '\'\'')} AS title`,
      `${field('name')} AS name`,
      `${field('first_user_message')} AS first_user_message`,
      `${field('preview')} AS preview`,
      `${field('cwd', '\'\'')} AS cwd`,
      `${field('updated_at')} AS updated_at`,
      `${field('updated_at_ms')} AS updated_at_ms`,
      `${field('created_at')} AS created_at`,
      `${field('created_at_ms')} AS created_at_ms`,
      `${field('archived', '0')} AS archived`,
      `${field('source', '\'\'')} AS source`,
      `${field('model')} AS model`,
      `${field('model_provider')} AS model_provider`,
      `${field('tokens_used', '0')} AS tokens_used`,
      `${field('rollout_path')} AS rollout_path`,
      `${field('git_branch')} AS git_branch`,
    ].join(', ')} FROM threads`;

    return (client.prepare(query).all() as Array<Record<string, unknown>>)
      .map((row) => {
        const updatedAtMs = numberValue(row.updated_at_ms)
          ?? (numberValue(row.updated_at) ?? 0) * 1000;
        const createdAtMs = numberValue(row.created_at_ms)
          ?? (numberValue(row.created_at) ?? 0) * 1000;
        return {
          id: stringValue(row.id),
          title: stringValue(row.title),
          name: nullableString(row.name),
          firstUserMessage: nullableString(row.first_user_message),
          preview: nullableString(row.preview),
          cwd: stringValue(row.cwd),
          updatedAtMs,
          createdAtMs,
          archived: numberValue(row.archived) === 1,
          source: stringValue(row.source),
          model: nullableString(row.model),
          modelProvider: nullableString(row.model_provider),
          tokensUsed: numberValue(row.tokens_used) ?? 0,
          rolloutPath: nullableString(row.rollout_path),
          gitBranch: nullableString(row.git_branch),
        };
      })
      .filter((thread) => thread.id.length > 0);
  } catch (error) {
    if (error instanceof SessionSourceError) {
      throw error;
    }
    throw new SessionSourceError(
      'CODEX_READ_FAILED',
      error instanceof Error ? error.message : 'Unable to read Codex threads',
    );
  } finally {
    client.close();
  }
}

export function readCodexProjects(codexHome: string): CodexProjectState {
  const statePath = path.join(codexHome, '.codex-global-state.json');
  if (!existsSync(statePath)) {
    return unavailableProjects();
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return unavailableProjects();
  }
  if (!isRecord(raw)) {
    return unavailableProjects();
  }

  const projects = new Map<string, SessionProject>();
  const localProjects = isRecord(raw['local-projects']) ? raw['local-projects'] : null;
  if (localProjects) {
    for (const [key, value] of Object.entries(localProjects)) {
      if (!isRecord(value)) {
        continue;
      }
      const id = stringValue(value.id) || key;
      const name = stringValue(value.name) || id;
      const roots = Array.isArray(value.rootPaths)
        ? value.rootPaths.filter((root): root is string => typeof root === 'string')
        : [];
      projects.set(id, { id, name, roots });
    }
  }

  const assignments = new Map<string, string>();
  const rawAssignments = isRecord(raw['thread-project-assignments'])
    ? raw['thread-project-assignments']
    : null;
  if (rawAssignments) {
    for (const [threadId, value] of Object.entries(rawAssignments)) {
      if (isRecord(value) && typeof value.projectId === 'string') {
        assignments.set(threadId, value.projectId);
      }
    }
  }

  const projectless = new Set(
    Array.isArray(raw['projectless-thread-ids'])
      ? raw['projectless-thread-ids'].filter(
          (threadId): threadId is string => typeof threadId === 'string',
        )
      : [],
  );

  const warnings: SessionWarning[] = localProjects
    ? []
    : [{ code: 'PROJECTS_UNAVAILABLE' }];

  return {
    projects: projects.values().toArray(),
    assignments,
    projectless,
    warnings,
  };
}

export function indexCodexRolloutFiles(codexHome: string): RolloutFileIndex {
  const files: string[] = [];
  let unreadable = collectRolloutFiles(path.join(codexHome, 'sessions'), files);
  unreadable += collectRolloutFiles(path.join(codexHome, 'archived_sessions'), files);

  const usage = new Map<string, RolloutFileUsage>();
  for (const filePath of files) {
    const match = ROLLOUT_FILE_PATTERN.exec(path.basename(filePath));
    if (!match) {
      continue;
    }
    let size: number;
    try {
      size = statSync(filePath).size;
    } catch {
      unreadable += 1;
      continue;
    }
    const threadId = match[1];
    const current = usage.get(threadId) ?? { bytes: 0, segments: 0 };
    usage.set(threadId, {
      bytes: current.bytes + size,
      segments: current.segments + 1,
    });
  }

  return { files: usage, unreadable };
}

function stateDatabaseCandidates(codexHome: string): string[] {
  const candidates: string[] = [];
  for (const directory of [codexHome, path.join(codexHome, 'sqlite')]) {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isFile() && (/^state.*\.sqlite$/u).test(entry.name)) {
        candidates.push(path.join(directory, entry.name));
      }
    }
  }
  return candidates;
}

function collectRolloutFiles(directory: string, files: string[]): number {
  if (!existsSync(directory)) {
    return 0;
  }
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return 1;
  }

  let unreadable = 0;
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      unreadable += collectRolloutFiles(entryPath, files);
    } else if (entry.isFile() && ROLLOUT_FILE_PATTERN.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return unreadable;
}

function openReadonly(databasePath: string): Database.Database {
  return new Database(databasePath, {
    readonly: true,
    fileMustExist: true,
    timeout: 5000,
  });
}

function hasTable(client: Database.Database, name: string): boolean {
  return client.prepare(
    'SELECT 1 FROM sqlite_master WHERE type = \'table\' AND name = ?',
  ).get(name) !== undefined;
}

function unavailableProjects(): CodexProjectState {
  return {
    projects: [],
    assignments: new Map(),
    projectless: new Set(),
    warnings: [{ code: 'PROJECTS_UNAVAILABLE' }],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
