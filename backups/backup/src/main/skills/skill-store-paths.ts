import { chmod, mkdir } from 'node:fs/promises';
import path from 'node:path';

const STORE_DIRECTORY_MODE = 0o700;

export class SkillStorePaths {
  readonly root: string;
  readonly remoteOperations: string;

  constructor(userHomeDirectory: string) {
    if (!path.isAbsolute(userHomeDirectory)) {
      throw new Error('The user home directory must be absolute.');
    }
    this.root = path.join(userHomeDirectory, '.foundry', 'skills-store');
    this.remoteOperations = path.join(this.root, '.remote-operations');
  }

  async initialize(): Promise<void> {
    const directories = [this.root, this.remoteOperations];
    for (const directory of directories) {
      await mkdir(directory, { recursive: true, mode: STORE_DIRECTORY_MODE });
      await chmod(directory, STORE_DIRECTORY_MODE);
    }
  }
}
