import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  lstatSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { StringDecoder } from 'node:string_decoder';
import { SessionSourceError } from './contracts';

const JSONL_EXTENSION = '.jsonl';
const SESSIONS_INDEX_FILE = 'sessions-index.json';

interface ClaudeIndexEntry {
  sessionId: string;
  filePath: string | null;
  firstPrompt: string | null;
  summary: string | null;
  gitBranch: string | null;
  projectPath: string | null;
  isSidechain: boolean;
  createdAtMs: number | null;
  updatedAtMs: number | null;
}

interface ClaudeProjectIndex {
  originalPath: string | null;
  entries: ClaudeIndexEntry[];
}

interface ClaudeTranscriptMetadata {
  cwd: string;
  gitBranch: string | null;
  firstPrompt: string | null;
  customTitle: string | null;
  lastPrompt: string | null;
  model: string | null;
  tokensUsed: number;
  createdAtMs: number | null;
  updatedAtMs: number | null;
  isSidechain: boolean;
}

export interface ClaudeSessionRecord {
  id: string;
  title: string;
  projectPath: string;
  createdAtMs: number;
  updatedAtMs: number;
  sizeBytes: number;
  tokensUsed: number;
  model: string | null;
  cwd: string;
  gitBranch: string | null;
  subagent: boolean;
}

export interface ClaudeSessionState {
  sessions: ClaudeSessionRecord[];
}

export function readClaudeSessionState(claudeHome: string): ClaudeSessionState {
  const projectsRoot = path.join(claudeHome, 'projects');
  if (!existsSync(projectsRoot)) {
    throw new SessionSourceError(
      'CLAUDE_DATA_NOT_FOUND',
      'Claude Code sessions directory was not found',
    );
  }

  let projectDirectories;
  try {
    projectDirectories = readdirSync(projectsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(projectsRoot, entry.name));
  } catch (error) {
    throw new SessionSourceError(
      'CLAUDE_READ_FAILED',
      error instanceof Error ? error.message : 'Unable to read Claude Code sessions',
    );
  }

  const sessions: ClaudeSessionRecord[] = [];
  const visitedFiles = new Set<string>();

  for (const projectDirectory of projectDirectories) {
    const projectIndex = readProjectIndex(projectDirectory);

    for (const entry of projectIndex.entries) {
      const filePath = resolveIndexedSessionPath(
        projectsRoot,
        projectDirectory,
        entry,
      );
      if (!filePath || visitedFiles.has(filePath)) {
        continue;
      }

      const session = readClaudeSession(filePath, entry, projectIndex.originalPath);
      visitedFiles.add(filePath);
      if (session) {
        sessions.push(session);
      }
    }

    for (const filePath of sessionFiles(projectDirectory)) {
      if (visitedFiles.has(filePath)) {
        continue;
      }

      const session = readClaudeSession(filePath, null, projectIndex.originalPath);
      visitedFiles.add(filePath);
      if (session) {
        sessions.push(session);
      }
    }
  }

  return { sessions };
}

function readProjectIndex(projectDirectory: string): ClaudeProjectIndex {
  const indexPath = path.join(projectDirectory, SESSIONS_INDEX_FILE);
  if (!existsSync(indexPath)) {
    return { originalPath: null, entries: [] };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(indexPath, 'utf8')) as unknown;
  } catch {
    return { originalPath: null, entries: [] };
  }

  if (!isRecord(raw) || !Array.isArray(raw.entries)) {
    return { originalPath: null, entries: [] };
  }

  const entries: ClaudeIndexEntry[] = [];
  for (const value of raw.entries) {
    const entry = toIndexEntry(value);
    if (entry) {
      entries.push(entry);
    }
  }

  return {
    originalPath: nullableString(raw.originalPath),
    entries,
  };
}

function toIndexEntry(value: unknown): ClaudeIndexEntry | null {
  if (!isRecord(value)) {
    return null;
  }
  const sessionId = stringValue(value.sessionId);
  if (!isSafeSessionId(sessionId)) {
    return null;
  }

  return {
    sessionId,
    filePath: nullableString(value.fullPath),
    firstPrompt: nullableString(value.firstPrompt),
    summary: nullableString(value.summary),
    gitBranch: nullableString(value.gitBranch),
    projectPath: nullableString(value.projectPath),
    isSidechain: value.isSidechain === true,
    createdAtMs: dateValue(value.created) ?? numberValue(value.fileMtime),
    updatedAtMs: dateValue(value.modified)
      ?? numberValue(value.fileMtime),
  };
}

function resolveIndexedSessionPath(
  projectsRoot: string,
  projectDirectory: string,
  entry: ClaudeIndexEntry,
): string | null {
  const directPath = path.join(projectDirectory, `${entry.sessionId}${JSONL_EXTENSION}`);
  if (isSessionFile(directPath)) {
    return directPath;
  }

  if (
    entry.filePath
    && path.isAbsolute(entry.filePath)
    && isPathInside(projectsRoot, entry.filePath)
    && isSessionFile(entry.filePath)
  ) {
    return entry.filePath;
  }

  return null;
}

function sessionFiles(projectDirectory: string): string[] {
  let entries;
  try {
    entries = readdirSync(projectDirectory, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(JSONL_EXTENSION))
    .map((entry) => path.join(projectDirectory, entry.name));
}

function readClaudeSession(
  filePath: string,
  indexEntry: ClaudeIndexEntry | null,
  projectOriginalPath: string | null,
): ClaudeSessionRecord | null {
  let fileStat;
  try {
    fileStat = statSync(filePath);
  } catch {
    return null;
  }

  let transcript: ClaudeTranscriptMetadata;
  try {
    transcript = readTranscriptMetadata(filePath);
  } catch {
    return null;
  }

  const id = indexEntry?.sessionId
    ?? path.basename(filePath, JSONL_EXTENSION);
  const projectPath = firstNonEmpty([
    indexEntry?.projectPath,
    projectOriginalPath,
    transcript.cwd,
  ]);
  const createdAtMs = indexEntry?.createdAtMs
    ?? transcript.createdAtMs
    ?? fileStat.mtimeMs;
  const updatedAtMs = indexEntry?.updatedAtMs
    ?? transcript.updatedAtMs
    ?? fileStat.mtimeMs;
  const title = firstNonEmpty([
    transcript.customTitle,
    indexEntry?.summary,
    transcript.firstPrompt,
    indexEntry?.firstPrompt,
    transcript.lastPrompt,
    id.slice(0, 8),
  ]);

  return {
    id,
    title,
    projectPath,
    createdAtMs,
    updatedAtMs: Math.max(createdAtMs, updatedAtMs),
    sizeBytes: fileStat.size,
    tokensUsed: transcript.tokensUsed,
    model: transcript.model,
    cwd: firstNonEmpty([transcript.cwd, projectPath]),
    gitBranch: firstNonEmpty([transcript.gitBranch, indexEntry?.gitBranch]) || null,
    subagent: indexEntry?.isSidechain === true || transcript.isSidechain,
  };
}

function readTranscriptMetadata(filePath: string): ClaudeTranscriptMetadata {
  let cwd = '';
  let gitBranch: string | null = null;
  let firstPrompt: string | null = null;
  let customTitle: string | null = null;
  let lastPrompt: string | null = null;
  let model: string | null = null;
  let tokensUsed = 0;
  let createdAtMs: number | null = null;
  let updatedAtMs: number | null = null;
  let isSidechain = false;

  forEachLine(filePath, (line) => {
    if (!line.trim()) {
      return;
    }

    let record: unknown;
    try {
      record = JSON.parse(line) as unknown;
    } catch {
      return;
    }
    if (!isRecord(record)) {
      return;
    }

    const timestamp = dateValue(record.timestamp);
    if (timestamp !== null) {
      createdAtMs = createdAtMs === null
        ? timestamp
        : Math.min(createdAtMs, timestamp);
      updatedAtMs = updatedAtMs === null
        ? timestamp
        : Math.max(updatedAtMs, timestamp);
    }

    cwd ||= stringValue(record.cwd);
    if (record.isSidechain === true) {
      isSidechain = true;
    }
    if (record.type === 'custom-title') {
      customTitle = nullableString(record.customTitle) ?? customTitle;
    } else if (record.type === 'last-prompt') {
      lastPrompt = nullableString(record.lastPrompt) ?? lastPrompt;
    }

    const message = isRecord(record.message) ? record.message : null;
    if (!message) {
      return;
    }

    if (record.type === 'user' && record.isMeta !== true && message.role === 'user') {
      firstPrompt ||= nullableString(extractText(message.content));
    }

    if (record.type !== 'assistant' || message.role !== 'assistant') {
      return;
    }

    gitBranch = nullableString(record.gitBranch) ?? gitBranch;
    const messageModel = nullableString(message.model);
    if (messageModel && messageModel !== '<synthetic>') {
      model = messageModel;
    }
    tokensUsed += tokenCount(message.usage);
  });

  return {
    cwd,
    gitBranch,
    firstPrompt,
    customTitle,
    lastPrompt,
    model,
    tokensUsed,
    createdAtMs,
    updatedAtMs,
    isSidechain,
  };
}

function forEachLine(filePath: string, callback: (line: string) => void): void {
  const fd = openSync(filePath, 'r');
  const decoder = new StringDecoder('utf8');
  const buffer = Buffer.allocUnsafe(256 * 1024);
  let carry = '';

  try {
    let bytesRead = readSync(fd, buffer, 0, buffer.length, null);
    while (bytesRead > 0) {
      carry += decoder.write(buffer.subarray(0, bytesRead));
      let lineStart = 0;
      let lineEnd = carry.indexOf('\n', lineStart);
      while (lineEnd !== -1) {
        callback(carry.slice(lineStart, lineEnd));
        lineStart = lineEnd + 1;
        lineEnd = carry.indexOf('\n', lineStart);
      }
      carry = carry.slice(lineStart);
      bytesRead = readSync(fd, buffer, 0, buffer.length, null);
    }

    carry += decoder.end();
    if (carry.length > 0) {
      callback(carry);
    }
  } finally {
    closeSync(fd);
  }
}

function extractText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (!Array.isArray(value)) {
    return '';
  }

  const texts: string[] = [];
  for (const part of value) {
    if (isRecord(part) && part.type === 'text' && typeof part.text === 'string') {
      texts.push(part.text);
    }
  }
  return texts.join('\n');
}

function tokenCount(value: unknown): number {
  if (!isRecord(value)) {
    return 0;
  }

  return [
    value.input_tokens,
    value.output_tokens,
    value.cache_creation_input_tokens,
    value.cache_read_input_tokens,
  ].reduce<number>((total, count) => total + Math.max(0, numberValue(count) ?? 0), 0);
}

function isSessionFile(filePath: string): boolean {
  if (!filePath.endsWith(JSONL_EXTENSION)) {
    return false;
  }
  try {
    return lstatSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isSafeSessionId(value: string): boolean {
  return value.length > 0
    && value === path.basename(value)
    && value !== '.'
    && value !== '..';
}

function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative.length > 0
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

function firstNonEmpty(values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = (value ?? '').replaceAll(/\s+/gu, ' ').trim();
    if (normalized.length > 0) {
      return normalized.slice(0, 240);
    }
  }
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function dateValue(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}
