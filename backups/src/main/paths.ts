import { chmodSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

export function getFoundryHomePath(): string {
  return path.join(os.homedir(), '.foundry');
}

export function ensureFoundryHome(): string {
  const foundryHome = getFoundryHomePath();
  mkdirSync(foundryHome, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') {
    chmodSync(foundryHome, 0o700);
  }
  return foundryHome;
}

export function getFoundryDatabasePath(): string {
  return path.join(getFoundryHomePath(), 'foundry.sqlite');
}

export function getFoundrySettingsPath(): string {
  return path.join(getFoundryHomePath(), 'settings.json');
}

export function getFoundryDataTransferPath(): string {
  return path.join(getFoundryHomePath(), '.data-transfer');
}
