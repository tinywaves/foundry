import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

export function resolveCodexHomePath(): string {
  const configured = process.env.CODEX_HOME?.trim();
  return configured ? path.resolve(configured) : path.join(os.homedir(), '.codex');
}
