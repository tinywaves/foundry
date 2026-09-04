import envPaths from 'env-paths';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const DATABASE_FILENAME = 'foundry.sqlite';

export function getFoundryDataDirectory(): string {
  if (
    process.platform !== 'darwin'
    && process.platform !== 'win32'
    && process.env.XDG_DATA_HOME
    && !path.isAbsolute(process.env.XDG_DATA_HOME)
  ) {
    return path.join(homedir(), '.local', 'share', 'foundry');
  }

  return envPaths('foundry', { suffix: '' }).data;
}

export function getFoundryDatabasePath(): string {
  return path.join(getFoundryDataDirectory(), DATABASE_FILENAME);
}
