import assert from 'node:assert/strict';
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { scanSkillTarget } from './skill-discovery-scanner';

const targetId = '00000000-0000-4000-8000-000000000401';

test('finds exact Skill Packages within depth while pruning reserved roots', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-scan-'));

  try {
    await mkdir(path.join(temporaryRoot, 'direct'));
    await writeFile(path.join(temporaryRoot, 'direct', 'SKILL.md'), '# Direct\n');
    await mkdir(path.join(temporaryRoot, 'group', 'nested'), { recursive: true });
    await writeFile(path.join(temporaryRoot, 'group', 'nested', 'SKILL.md'), '# Nested\n');
    await mkdir(path.join(temporaryRoot, 'group', 'too-deep', 'skill'), { recursive: true });
    await writeFile(
      path.join(temporaryRoot, 'group', 'too-deep', 'skill', 'SKILL.md'),
      '# Too deep\n',
    );
    await mkdir(path.join(temporaryRoot, 'wrong-case'));
    await writeFile(path.join(temporaryRoot, 'wrong-case', 'skill.md'), '# Wrong\n');
    await mkdir(path.join(temporaryRoot, 'Synced', 'managed'), { recursive: true });
    await writeFile(path.join(temporaryRoot, 'Synced', 'managed', 'SKILL.md'), '# Managed\n');

    const result = await scanSkillTarget({
      targetId,
      rootPath: temporaryRoot,
      maxScanDepth: 2,
      allowSymlinkEscape: false,
      excludedRootEntries: [{ name: 'synced', caseSensitive: false }],
    });

    assert.equal(result.rootStatus, 'scanned');
    assert.deepEqual(result.candidates.map((candidate) => candidate.relativePath), [
      'direct',
      'group/nested',
    ]);
    assert.equal(result.truncated, false);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('blocks unapproved symlink escapes and can scan an explicitly allowed target', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-scan-link-'));
  const targetRoot = path.join(temporaryRoot, 'target');
  const externalRoot = path.join(temporaryRoot, 'external');

  try {
    await mkdir(targetRoot);
    await mkdir(path.join(externalRoot, 'linked-skill'), { recursive: true });
    await writeFile(path.join(externalRoot, 'linked-skill', 'SKILL.md'), '# Linked\n');
    await symlink(path.join(externalRoot, 'linked-skill'), path.join(targetRoot, 'linked'));

    const blocked = await scanSkillTarget({
      targetId,
      rootPath: targetRoot,
      maxScanDepth: 2,
      allowSymlinkEscape: false,
      excludedRootEntries: [],
    });
    const allowed = await scanSkillTarget({
      targetId,
      rootPath: targetRoot,
      maxScanDepth: 2,
      allowSymlinkEscape: true,
      excludedRootEntries: [],
    });

    assert.deepEqual(blocked.candidates, []);
    assert.equal(blocked.warnings[0]?.code, 'symlink-escape-blocked');
    assert.deepEqual(allowed.candidates.map((candidate) => candidate.relativePath), ['linked']);
    assert.equal(
      allowed.candidates[0]?.contentPath,
      await realpath(path.join(externalRoot, 'linked-skill')),
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('reports a missing root without treating it as a completed scan', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-scan-missing-'));
  const missingRoot = path.join(temporaryRoot, 'not-installed');

  try {
    const result = await scanSkillTarget({
      targetId,
      rootPath: missingRoot,
      maxScanDepth: 2,
      allowSymlinkEscape: false,
      excludedRootEntries: [],
    });

    assert.equal(result.rootStatus, 'missing');
    assert.equal(result.directoriesInspected, 0);
    assert.equal(result.truncated, false);
    assert.deepEqual(result.candidates, []);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('stops at the traversal-count boundary and reports a partial observation', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-scan-bounded-'));

  try {
    await Promise.all([
      mkdir(path.join(temporaryRoot, 'a')),
      mkdir(path.join(temporaryRoot, 'b')),
      mkdir(path.join(temporaryRoot, 'c')),
    ]);

    const result = await scanSkillTarget({
      targetId,
      rootPath: temporaryRoot,
      maxScanDepth: 2,
      allowSymlinkEscape: false,
      excludedRootEntries: [],
    }, 2);

    assert.equal(result.rootStatus, 'scanned');
    assert.equal(result.directoriesInspected, 2);
    assert.equal(result.truncated, true);
    assert.equal(
      result.warnings.some((warning) => warning.code === 'traversal-limit-reached'),
      true,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
