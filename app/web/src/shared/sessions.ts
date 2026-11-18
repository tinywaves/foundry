export type SessionThreadBucket = 'assigned' | 'projectless' | 'unassigned';

export type SessionProject = {
  id: string;
  name: string;
  roots: string[];
};

export type SessionThread = {
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
};

export type SessionWarningCode
  = | 'PROJECTS_UNAVAILABLE'
    | 'ROLLOUT_FILES_UNREADABLE';

export type SessionWarning = {
  code: SessionWarningCode;
  count?: number;
};

export type CodexSessionSnapshot = {
  source: 'codex';
  capturedAt: string;
  projects: SessionProject[];
  threads: SessionThread[];
  warnings: SessionWarning[];
};
