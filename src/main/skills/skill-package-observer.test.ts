import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { isRecognizedSkillPackage, observeSkillPackage } from './skill-package-observer';

test('recognizes only an exact root SKILL.md entry without validating its content', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-recognition-'));
  const malformed = path.join(temporaryRoot, 'malformed');
  const nested = path.join(temporaryRoot, 'nested');
  const wrongCase = path.join(temporaryRoot, 'wrong-case');

  try {
    await mkdir(malformed);
    await writeFile(path.join(malformed, 'SKILL.md'), '---\nname: [not valid yaml\n');
    await mkdir(path.join(nested, 'child'), { recursive: true });
    await writeFile(path.join(nested, 'child', 'SKILL.md'), '# Nested\n');
    await mkdir(wrongCase);
    await writeFile(path.join(wrongCase, 'skill.md'), '# Wrong case\n');

    assert.deepEqual(
      await Promise.all([
        isRecognizedSkillPackage(malformed),
        isRecognizedSkillPackage(nested),
        isRecognizedSkillPackage(wrongCase),
      ]),
      [true, false, false],
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('reports available, missing, and unreadable package observations explicitly', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-observation-'));
  const available = path.join(temporaryRoot, 'available');
  const missing = path.join(temporaryRoot, 'missing');
  const unreadable = path.join(temporaryRoot, 'unreadable');

  try {
    await mkdir(available);
    await writeFile(path.join(available, 'SKILL.md'), '# Available\n');
    await symlink(available, unreadable);

    const observations = await Promise.all([
      observeSkillPackage(available, 101),
      observeSkillPackage(missing, 102),
      observeSkillPackage(unreadable, 103),
    ]);

    const availableObservation = observations[0];
    assert.equal(availableObservation.status, 'available');
    assert.equal(availableObservation.observedAt, 101);
    assert.match(availableObservation.fingerprint, /^[0-9a-f]{64}$/);
    assert.deepEqual(observations.slice(1), [
      { status: 'missing', observedAt: 102 },
      { status: 'unreadable', observedAt: 103 },
    ]);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
