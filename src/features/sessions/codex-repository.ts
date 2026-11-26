import { stat } from 'node:fs/promises';
import path from 'node:path';
import { SessionSourceError } from './contracts';
import type { SessionThread, SessionWarning } from './contracts';
import {
  contentText,
  findTranscriptFiles,
  isRecord,
  nonnegative,
  readTranscript,
  text,
  threadTitle,
  timestamp,
} from './transcript-files';

interface CodexSegment {
  id: string;
  title: string;
  cwd: string;
  model: string | null;
  gitBranch: string | null;
  subagent: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  sizeBytes: number;
  tokensUsed: number;
}

export async function readCodexSessionState(codexHome: string): Promise<{
  threads: SessionThread[];
  warnings: SessionWarning[];
}> {
  const roots = await Promise.all([
    findTranscriptFiles(path.join(codexHome, 'sessions')),
    findTranscriptFiles(path.join(codexHome, 'archived_sessions')),
  ]);
  if (roots.every((root) => !root.found)) {
    throw new SessionSourceError('CODEX_DATA_NOT_FOUND', 'Codex session directories were not found');
  }
  let unreadable = roots.reduce((sum, root) => sum + root.unreadable, 0);
  const segments = new Map<string, CodexSegment[]>();
  for (const [index, root] of roots.entries()) {
    for (const file of root.files) {
      try {
        const result = await readSegment(file, index === 1);
        if (result.hasMalformedLines || !result.segment) {
          unreadable += 1;
        }
        if (result.segment) {
          const group = segments.get(result.segment.id) ?? [];
          group.push(result.segment);
          segments.set(result.segment.id, group);
        }
      } catch {
        unreadable += 1;
      }
    }
  }
  return {
    threads: Array.from(segments.values(), mergeSegments),
    warnings: unreadable > 0 ? [{ code: 'TRANSCRIPT_FILES_UNREADABLE', count: unreadable }] : [],
  };
}

async function readSegment(file: string, isArchived: boolean): Promise<{
  segment: CodexSegment | null;
  hasMalformedLines: boolean;
}> {
  const fileStat = await stat(file);
  const segment: CodexSegment = {
    id: '',
    title: '',
    cwd: '',
    model: null,
    gitBranch: null,
    subagent: false,
    archived: isArchived,
    createdAt: Infinity,
    updatedAt: 0,
    sizeBytes: fileStat.size,
    tokensUsed: 0,
  };
  let firstPrompt = '';
  const { hasMalformedLines } = await readTranscript(file, (record) => {
    const date = timestamp(record.timestamp);
    if (date !== null) {
      segment.createdAt = Math.min(segment.createdAt, date);
      segment.updatedAt = Math.max(segment.updatedAt, date);
    }
    const payload = isRecord(record.payload) ? record.payload : {};
    if (record.type === 'session_meta') {
      segment.id ||= text(payload.id);
      segment.cwd ||= text(payload.cwd);
      segment.model ??= text(payload.model_provider) || null;
      const git = isRecord(payload.git) ? payload.git : {};
      segment.gitBranch ??= text(git.branch) || null;
      segment.subagent ||= Boolean(payload.parent_thread_id)
        || (isRecord(payload.source) && 'subagent' in payload.source)
        || (isRecord(payload.thread_source) && 'subagent' in payload.thread_source);
    } else if (record.type === 'turn_context') {
      segment.cwd = text(payload.cwd) || segment.cwd;
      segment.model = text(payload.model) || segment.model;
    } else if (record.type === 'response_item' && payload.type === 'message' && payload.role === 'user') {
      const prompt = contentText(payload.content).trim();
      // Environment and repository instructions are also persisted as user messages.
      if (prompt && !prompt.startsWith('<environment_context>') && !prompt.startsWith('# AGENTS.md instructions')) {
        firstPrompt ||= prompt;
      }
    } else if (record.type === 'token_usage_record') {
      const usage = isRecord(payload.thread_token_usage) ? payload.thread_token_usage : {};
      segment.tokensUsed = Math.max(segment.tokensUsed, nonnegative(usage.total_tokens));
    } else if (record.type === 'event_msg' && payload.type === 'token_count') {
      const info = isRecord(payload.info) ? payload.info : {};
      const usage = isRecord(info.total_token_usage) ? info.total_token_usage : {};
      segment.tokensUsed = Math.max(segment.tokensUsed, nonnegative(usage.total_tokens));
    }
  });
  segment.title = firstPrompt;
  // Some continuation files carry events without repeating session_meta.
  segment.id ||= (/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/u).exec(path.basename(file))?.[1] ?? '';
  if (!Number.isFinite(segment.createdAt)) {
    return { segment: null, hasMalformedLines: true };
  }
  return { segment: segment.id ? segment : null, hasMalformedLines };
}

function mergeSegments(segments: CodexSegment[]): SessionThread {
  segments.sort((left, right) => left.updatedAt - right.updatedAt);
  const first = segments[0];
  return {
    id: first.id,
    title: threadTitle(segments.find((segment) => segment.title)?.title ?? '', first.id),
    cwd: segments.findLast((segment) => segment.cwd)?.cwd ?? '',
    model: segments.findLast((segment) => segment.model)?.model ?? null,
    gitBranch: segments.findLast((segment) => segment.gitBranch)?.gitBranch ?? null,
    archived: segments.every((segment) => segment.archived),
    subagent: segments.some((segment) => segment.subagent),
    createdAt: new Date(Math.min(...segments.map((segment) => segment.createdAt))).toISOString(),
    updatedAt: new Date(Math.max(...segments.map((segment) => segment.updatedAt))).toISOString(),
    sizeBytes: segments.reduce((sum, segment) => sum + segment.sizeBytes, 0),
    segmentCount: segments.length,
    tokensUsed: Math.max(...segments.map((segment) => segment.tokensUsed)),
  };
}
