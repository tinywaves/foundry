import { randomUUID } from 'node:crypto';
import { chmodSync, closeSync, fsyncSync, mkdirSync, openSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export function privateDirectory(directory: string): void {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') {
    chmodSync(directory, 0o700);
  }
}
export function syncDirectory(directory: string): void {
  if (process.platform === 'win32') {
    return;
  }
  const fd = openSync(directory, 'r');
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
export function writeJsonAtomic(filename: string, value: unknown): void {
  privateDirectory(path.dirname(filename));
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    const fd = openSync(temporary, 'wx', 0o600);
    try {
      writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(temporary, filename);
    syncDirectory(path.dirname(filename));
  } finally {
    rmSync(temporary, { force: true });
  }
}
