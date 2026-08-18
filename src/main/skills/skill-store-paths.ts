import { chmod, mkdir } from 'node:fs/promises';
import path from 'node:path';

const STORE_DIRECTORY_MODE = 0o700;

export class SkillStorePaths {
  readonly root: string;
  readonly packages: string;
  readonly revisions: string;
  readonly trash: string;
  readonly operations: string;
  readonly targetOperations: string;
  readonly trashOperations: string;
  readonly remoteOperations: string;

  constructor(userHomeDirectory: string) {
    if (!path.isAbsolute(userHomeDirectory)) {
      throw new Error('The user home directory must be absolute.');
    }
    this.root = path.join(userHomeDirectory, '.foundry', 'skills-store');
    this.packages = path.join(this.root, 'packages');
    this.revisions = path.join(this.root, 'revisions');
    this.trash = path.join(this.root, 'trash');
    this.operations = path.join(this.root, '.operations');
    this.targetOperations = path.join(this.root, '.target-operations');
    this.trashOperations = path.join(this.root, '.trash-operations');
    this.remoteOperations = path.join(this.root, '.remote-operations');
  }

  async initialize(): Promise<void> {
    const directories = [
      this.root,
      this.packages,
      this.revisions,
      this.trash,
      this.operations,
      this.targetOperations,
      this.trashOperations,
      this.remoteOperations,
    ];
    for (const directory of directories) {
      await mkdir(directory, { recursive: true, mode: STORE_DIRECTORY_MODE });
      await chmod(directory, STORE_DIRECTORY_MODE);
    }
  }
}
