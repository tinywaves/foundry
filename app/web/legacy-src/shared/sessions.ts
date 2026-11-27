export type SessionSource = 'codex' | 'claude';

export type SessionThread = {
  id: string;
  title: string;
  archived: boolean;
  subagent: boolean;
  parentThreadId: string | null;
  createdAt: string;
  updatedAt: string;
  sizeBytes: number;
  segmentCount: number;
  tokensUsed: number;
  model: string | null;
  cwd: string;
  gitBranch: string | null;
};

export type SessionWarningCode = 'TRANSCRIPT_FILES_UNREADABLE';

export type SessionWarning = {
  code: SessionWarningCode;
  count?: number;
};

export type SessionSnapshot = {
  source: SessionSource;
  capturedAt: string;
  threads: SessionThread[];
  warnings: SessionWarning[];
};

export type CodexSessionSnapshot = SessionSnapshot & {
  source: 'codex';
};

export type ClaudeSessionSnapshot = SessionSnapshot & {
  source: 'claude';
};
