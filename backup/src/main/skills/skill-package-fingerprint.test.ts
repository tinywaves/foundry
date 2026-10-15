import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { fingerprintSkillPackage } from './skill-package-fingerprint';

test('produces the same Content Fingerprint regardless of entry creation order', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-fingerprint-'));
  const firstPackage = path.join(temporaryRoot, 'first');
  const secondPackage = path.join(temporaryRoot, 'second');

  try {
    await mkdir(path.join(firstPackage, 'references'), { recursive: true });
    await writeFile(path.join(firstPackage, 'SKILL.md'), '# Example\n');
    await writeFile(path.join(firstPackage, 'references', 'guide.md'), 'Guide\n');

    await mkdir(secondPackage, { recursive: true });
    await writeFile(path.join(secondPackage, 'SKILL.md'), '# Example\n');
    await mkdir(path.join(secondPackage, 'references'));
    await writeFile(path.join(secondPackage, 'references', 'guide.md'), 'Guide\n');

    assert.equal(
      await fingerprintSkillPackage(firstPackage),
      await fingerprintSkillPackage(secondPackage),
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('changes the Content Fingerprint for every package-tree fact', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-fingerprint-facts-'));

  try {
    const packageRoots = await Promise.all(
      ['base', 'path', 'type', 'bytes', 'link', 'empty-directory'].map(async (name) => {
        const packageRoot = path.join(temporaryRoot, name);
        await mkdir(packageRoot);
        await writeFile(path.join(packageRoot, 'SKILL.md'), '# Example\n');
        return packageRoot;
      }),
    );
    const [base, changedPath, changedType, changedBytes, changedLink, changedEmptyDirectory]
      = packageRoots;

    await writeFile(path.join(base, 'entry'), 'same');
    await symlink('entry', path.join(base, 'shortcut'));

    await writeFile(path.join(changedPath, 'renamed'), 'same');
    await symlink('renamed', path.join(changedPath, 'shortcut'));

    await mkdir(path.join(changedType, 'entry'));
    await symlink('entry', path.join(changedType, 'shortcut'));

    await writeFile(path.join(changedBytes, 'entry'), 'different');
    await symlink('entry', path.join(changedBytes, 'shortcut'));

    await writeFile(path.join(changedLink, 'entry'), 'same');
    await symlink('SKILL.md', path.join(changedLink, 'shortcut'));

    await writeFile(path.join(changedEmptyDirectory, 'entry'), 'same');
    await symlink('entry', path.join(changedEmptyDirectory, 'shortcut'));
    await mkdir(path.join(changedEmptyDirectory, 'empty'));

    const [baseFingerprint, ...changedFingerprints] = await Promise.all(
      packageRoots.map((packageRoot) => fingerprintSkillPackage(packageRoot)),
    );
    assert.deepEqual(
      changedFingerprints.map((fingerprint) => fingerprint !== baseFingerprint),
      [true, true, true, true, true],
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('ignores filesystem timestamps', async () => {
  const packageRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-fingerprint-time-'));

  try {
    const manifestPath = path.join(packageRoot, 'SKILL.md');
    await writeFile(manifestPath, '# Example\n');
    const before = await fingerprintSkillPackage(packageRoot);

    await utimes(manifestPath, new Date('2020-01-01T00:00:00Z'), new Date('2030-01-01T00:00:00Z'));

    assert.equal(await fingerprintSkillPackage(packageRoot), before);
  } finally {
    await rm(packageRoot, { recursive: true, force: true });
  }
});

test('tracks executable permission but ignores other permission bits', async () => {
  const packageRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-fingerprint-mode-'));

  try {
    const manifestPath = path.join(packageRoot, 'SKILL.md');
    await writeFile(manifestPath, '# Example\n');
    await chmod(manifestPath, 0o600);
    const regular = await fingerprintSkillPackage(packageRoot);

    await chmod(manifestPath, 0o644);
    assert.equal(await fingerprintSkillPackage(packageRoot), regular);

    await chmod(manifestPath, 0o755);
    assert.notEqual(await fingerprintSkillPackage(packageRoot), regular);
  } finally {
    await rm(packageRoot, { recursive: true, force: true });
  }
});

test('does not follow symbolic links outside the Skill Package', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-fingerprint-link-'));
  const packageRoot = path.join(temporaryRoot, 'package');
  const externalFile = path.join(temporaryRoot, 'external.txt');

  try {
    await mkdir(packageRoot);
    await writeFile(path.join(packageRoot, 'SKILL.md'), '# Example\n');
    await writeFile(externalFile, 'first external value');
    await symlink(externalFile, path.join(packageRoot, 'external'));
    const before = await fingerprintSkillPackage(packageRoot);

    await writeFile(externalFile, 'different external value');

    assert.equal(await fingerprintSkillPackage(packageRoot), before);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
