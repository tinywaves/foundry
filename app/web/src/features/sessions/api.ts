import { requestJSON } from '../../lib/api';
import type { CodexSessionSnapshot } from './types';

export const sessionKeys = {
  codex: ['sessions', 'codex'] as const,
};

export function getCodexSessions(): Promise<CodexSessionSnapshot> {
  return requestJSON<CodexSessionSnapshot>('/api/sessions/codex');
}
