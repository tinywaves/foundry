import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'vitest';
import { readSkillPackageManifest } from './skill-package-manifest';

test('reads and normalizes Skill manifest metadata', () => {
  const inspected = {
    format: 'foundry-skill-zip-v1' as const,
    entries: [
      {
        kind: 'file' as const,
        relativePath: 'SKILL.md',
        content: Buffer.from('---\nname: review\ndescription:  Review pull requests  \n---\n'),
        executable: false,
      },
    ],
    fingerprint: `v2:${'a'.repeat(64)}`,
    entryCount: 1,
    uncompressedBytes: 64,
  };

  assert.deepEqual(readSkillPackageManifest(inspected), {
    name: 'review',
    description: 'Review pull requests',
  });
});

test('normalizes an empty description to null', () => {
  const inspected = {
    format: 'foundry-skill-zip-v1' as const,
    entries: [
      {
        kind: 'file' as const,
        relativePath: 'SKILL.md',
        content: Buffer.from('---\nname: review\ndescription:  \n---\n'),
        executable: false,
      },
    ],
    fingerprint: `v2:${'b'.repeat(64)}`,
    entryCount: 1,
    uncompressedBytes: 40,
  };
  assert.equal(readSkillPackageManifest(inspected).description, null);
});
