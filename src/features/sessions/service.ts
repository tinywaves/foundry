import type { ClaudeSessionSnapshot, CodexSessionSnapshot, SessionSnapshot } from './contracts';
import { resolveClaudeHomePath } from './claude-home';
import { readClaudeSessionState } from './claude-repository';
import { resolveCodexHomePath } from './codex-home';
import { readCodexSessionState } from './codex-repository';

export class SessionService {
  constructor(
    private readonly codexHome = resolveCodexHomePath(),
    private readonly claudeHome = resolveClaudeHomePath(),
  ) {}

  async getCodexSnapshot(): Promise<CodexSessionSnapshot> {
    return snapshot('codex', await readCodexSessionState(this.codexHome));
  }

  async getClaudeSnapshot(): Promise<ClaudeSessionSnapshot> {
    return snapshot('claude', await readClaudeSessionState(this.claudeHome));
  }
}

function snapshot<T extends SessionSnapshot['source']>(
  source: T,
  state: Pick<SessionSnapshot, 'threads' | 'warnings'>,
): SessionSnapshot & { source: T } {
  return {
    source,
    capturedAt: new Date().toISOString(),
    threads: state.threads.toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    warnings: state.warnings,
  };
}
