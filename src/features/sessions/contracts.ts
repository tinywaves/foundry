export type SessionThreadBucket = 'assigned' | 'projectless' | 'unassigned';

export type SessionSource = 'codex' | 'claude';

export interface SessionProject {
  id: string;
  name: string;
  roots: string[];
}

export interface SessionThread {
  id: string;
  title: string;
  projectId: string | null;
  projectBucket: SessionThreadBucket;
  archived: boolean;
  subagent: boolean;
  createdAt: string;
  updatedAt: string;
  sizeBytes: number;
  segmentCount: number;
  tokensUsed: number;
  model: string | null;
  cwd: string;
  gitBranch: string | null;
}

export type SessionWarningCode
  = | 'PROJECTS_UNAVAILABLE'
    | 'ROLLOUT_FILES_UNREADABLE';

export interface SessionWarning {
  code: SessionWarningCode;
  count?: number;
}

export interface SessionSnapshot {
  source: SessionSource;
  capturedAt: string;
  projects: SessionProject[];
  threads: SessionThread[];
  warnings: SessionWarning[];
}

export interface CodexSessionSnapshot extends SessionSnapshot {
  source: 'codex';
}

export interface ClaudeSessionSnapshot extends SessionSnapshot {
  source: 'claude';
}

export type SessionErrorCode
  = | 'CODEX_DATA_NOT_FOUND'
    | 'UNSUPPORTED_CODEX_SCHEMA'
    | 'CODEX_READ_FAILED'
    | 'CLAUDE_DATA_NOT_FOUND'
    | 'CLAUDE_READ_FAILED';

export class SessionSourceError extends Error {
  constructor(
    readonly code: SessionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SessionSourceError';
  }
}
