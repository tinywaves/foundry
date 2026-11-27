import { rm } from 'node:fs/promises';

export async function removeBackupDirectory(directory: string): Promise<void> {
  try {
    await rm(directory, { recursive: true, force: true });
  } catch {
    console.error('Unable to remove backup temporary files');
  }
}
