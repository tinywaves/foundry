import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { SkillStorePaths } from './skill-store-paths';

test('owns only private remote-acquisition staging outside SQLite', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-store-home-'));
  try {
    const paths = new SkillStorePaths(userHome);
    await paths.initialize();
    assert.equal(paths.root, path.join(userHome, '.foundry', 'skills-store'));
    assert.equal(paths.remoteOperations, path.join(paths.root, '.remote-operations'));
    const rootStats = await stat(paths.root);
    const remoteOperationsStats = await stat(paths.remoteOperations);
    assert.equal(rootStats.mode & 0o777, 0o700);
    assert.equal(remoteOperationsStats.mode & 0o777, 0o700);
    assert.deepEqual(
      Object.keys(paths).toSorted((left, right) => left.localeCompare(right)),
      ['remoteOperations', 'root'],
    );
  } finally {
    await rm(userHome, { recursive: true, force: true });
  }
});
