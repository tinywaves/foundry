import { requestJSON } from '../../lib/api';
import type {
  ClaudeSessionSnapshot,
  CodexSessionSnapshot,
  SessionSnapshot,
  SessionSource,
} from './types';

export const sessionKeys = {
  codex: ['sessions', 'codex'] as const,
  claude: ['sessions', 'claude'] as const,
  source: (source: SessionSource) => ['sessions', source] as const,
};

export function getCodexSessions(): Promise<CodexSessionSnapshot> {
  return requestJSON<CodexSessionSnapshot>('/api/sessions/codex');
}

export function getClaudeSessions(): Promise<ClaudeSessionSnapshot> {
  return requestJSON<ClaudeSessionSnapshot>('/api/sessions/claude');
}

export function getSessions(source: SessionSource): Promise<SessionSnapshot> {
  return source === 'codex'
    ? getCodexSessions()
    : getClaudeSessions();
}
