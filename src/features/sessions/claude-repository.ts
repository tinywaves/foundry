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

export async function readClaudeSessionState(claudeHome: string): Promise<{
  threads: SessionThread[];
  warnings: SessionWarning[];
}> {
  const root = await findTranscriptFiles(path.join(claudeHome, 'projects'));
  if (!root.found) {
    throw new SessionSourceError('CLAUDE_DATA_NOT_FOUND', 'Claude Code sessions directory was not found');
  }
  let unreadable = root.unreadable;
  const threads = new Map<string, SessionThread>();
  for (const file of root.files) {
    try {
      const result = await readSession(file);
      if (result.hasMalformedLines || !result.thread) {
        unreadable += 1;
      }
      if (result.thread) {
        // Copies of the same transcript do not create duplicate threads.
        const previous = threads.get(result.thread.id);
        if (!previous || previous.updatedAt < result.thread.updatedAt) {
          threads.set(result.thread.id, result.thread);
        }
      }
    } catch {
      unreadable += 1;
    }
  }
  return {
    threads: threads.values().toArray(),
    warnings: unreadable > 0 ? [{ code: 'TRANSCRIPT_FILES_UNREADABLE', count: unreadable }] : [],
  };
}

async function readSession(file: string): Promise<{
  thread: SessionThread | null;
  hasMalformedLines: boolean;
}> {
  const fileStat = await stat(file);
  let id = '';
  let cwd = '';
  let gitBranch: string | null = null;
  let firstPrompt = '';
  let customTitle = '';
  let lastPrompt = '';
  let model: string | null = null;
  let createdAt = Infinity;
  let updatedAt = 0;
  const isNestedSubagent = file.split(path.sep).includes('subagents');
  let parentThreadId: string | null = isNestedSubagent
    ? path.basename(path.dirname(path.dirname(file)))
    : null;
  let isSubagent = isNestedSubagent;
  const usages = new Map<string, number>();
  let anonymousUsage = 0;
  const { hasMalformedLines } = await readTranscript(file, (record) => {
    // Nested subagent transcripts use their filename as their own identity;
    // sessionId there identifies the owning conversation.
    if (isNestedSubagent) {
      parentThreadId = text(record.sessionId) || parentThreadId;
    } else {
      id ||= text(record.sessionId);
    }
    cwd = text(record.cwd) || cwd;
    gitBranch = text(record.gitBranch) || gitBranch;
    isSubagent ||= record.isSidechain === true;
    const date = timestamp(record.timestamp);
    if (date !== null) {
      createdAt = Math.min(createdAt, date);
      updatedAt = Math.max(updatedAt, date);
    }
    if (record.type === 'custom-title') {
      customTitle = text(record.customTitle) || customTitle;
    } else if (record.type === 'last-prompt') {
      lastPrompt = text(record.lastPrompt) || lastPrompt;
    }
    const message = isRecord(record.message) ? record.message : {};
    if (record.type === 'user' && record.isMeta !== true && message.role === 'user') {
      firstPrompt ||= contentText(message.content).trim();
    }
    if (record.type !== 'assistant' || message.role !== 'assistant') {
      return;
    }
    const messageModel = text(message.model);
    if (messageModel && messageModel !== '<synthetic>') {
      model = messageModel;
    }
    const usage = isRecord(message.usage) ? message.usage : {};
    const tokens = [usage.input_tokens, usage.output_tokens, usage.cache_creation_input_tokens, usage.cache_read_input_tokens]
      .reduce<number>((sum, value) => sum + nonnegative(value), 0);
    const messageId = text(message.id) || text(record.uuid);
    if (messageId) {
      // Streaming can persist several content blocks for the same response.
      usages.set(messageId, Math.max(usages.get(messageId) ?? 0, tokens));
    } else {
      anonymousUsage += tokens;
    }
  });
  id ||= path.basename(file).replace(/\.jsonl(?:\.zst)?$/u, '');
  if (!Number.isFinite(createdAt)) {
    return { thread: null, hasMalformedLines: true };
  }
  return {
    thread: {
      id,
      title: threadTitle(customTitle || firstPrompt || lastPrompt, id),
      cwd,
      gitBranch,
      model,
      archived: false,
      subagent: isSubagent,
      parentThreadId,
      createdAt: new Date(createdAt).toISOString(),
      updatedAt: new Date(updatedAt).toISOString(),
      sizeBytes: fileStat.size,
      segmentCount: 1,
      tokensUsed: usages.values().reduce((sum, value) => sum + value, anonymousUsage),
    },
    hasMalformedLines,
  };
}
