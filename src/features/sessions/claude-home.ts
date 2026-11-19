import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

export function resolveClaudeHomePath(): string {
  const configured = process.env.CLAUDE_CONFIG_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(os.homedir(), '.claude');
}
