import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { SkillStorePaths } from './skill-store-paths';

test('initializes the canonical Skill Store under the supplied user home', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-store-home-'));

  try {
    const paths = new SkillStorePaths(userHome);
    await paths.initialize();

    assert.deepEqual(
      [
        paths.root,
        paths.packages,
        paths.revisions,
        paths.trash,
        paths.operations,
        paths.targetOperations,
        paths.trashOperations,
        paths.remoteOperations,
      ],
      [
        path.join(userHome, '.foundry', 'skills-store'),
        path.join(userHome, '.foundry', 'skills-store', 'packages'),
        path.join(userHome, '.foundry', 'skills-store', 'revisions'),
        path.join(userHome, '.foundry', 'skills-store', 'trash'),
        path.join(userHome, '.foundry', 'skills-store', '.operations'),
        path.join(userHome, '.foundry', 'skills-store', '.target-operations'),
        path.join(userHome, '.foundry', 'skills-store', '.trash-operations'),
        path.join(userHome, '.foundry', 'skills-store', '.remote-operations'),
      ],
    );

    const modes = await Promise.all(
      [
        paths.root,
        paths.packages,
        paths.revisions,
        paths.trash,
        paths.operations,
        paths.targetOperations,
        paths.trashOperations,
        paths.remoteOperations,
      ]
        .map(async (directory) => {
          const directoryStats = await stat(directory);
          return directoryStats.mode & 0o777;
        }),
    );
    assert.deepEqual(
      modes,
      [0o700, 0o700, 0o700, 0o700, 0o700, 0o700, 0o700, 0o700],
    );
  } finally {
    await rm(userHome, { recursive: true, force: true });
  }
});
