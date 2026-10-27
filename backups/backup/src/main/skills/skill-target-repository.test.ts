import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { resolveBuiltInSkillTargets } from './skill-target-adapters';
import { SkillTargetRepository } from './skill-target-repository';

const targetIds = [
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000304',
  '00000000-0000-4000-8000-000000000305',
  '00000000-0000-4000-8000-000000000306',
  '00000000-0000-4000-8000-000000000307',
  '00000000-0000-4000-8000-000000000308',
  '00000000-0000-4000-8000-000000000309',
];

test('persists built-in targets while preserving user policy overrides', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-target-repository-'));
  const database = openFoundryDatabase(':memory:');

  try {
    const definitions = await resolveBuiltInSkillTargets({
      userHomeDirectory: userHome,
      environment: {},
    });
    const ids = [...targetIds];
    let now = 100;
    const repository = new SkillTargetRepository(database, {
      createId: () => ids.shift()!,
      now: () => now,
    });

    const seeded = repository.synchronizeBuiltInTargets(definitions);
    assert.deepEqual(seeded.map((target) => target.kind), definitions.map((target) => target.kind));
    assert.equal(seeded.at(-1)?.documentationUrl, 'https://developers.openai.com/codex/skills');
    assert.equal(seeded.at(-1)?.sortOrder, 1000);

    const generic = seeded[0];
    now = 200;
    repository.updateTargetPolicy({
      targetId: generic.id,
      enabled: false,
      maxScanDepth: 7,
      allowSymlinkEscape: true,
    });
    now = 300;
    const reseeded = repository.synchronizeBuiltInTargets(definitions);

    assert.deepEqual(reseeded[0], {
      ...generic,
      enabled: false,
      maxScanDepth: 7,
      allowSymlinkEscape: true,
      policySource: 'user-override',
      updatedAt: 300,
    });
    assert.equal(ids.length, 0);
  } finally {
    database.close();
    await rm(userHome, { recursive: true, force: true });
  }
});

test('reuses one physical Target when a custom path aliases a built-in root', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-target-alias-'));
  const database = openFoundryDatabase(':memory:');

  try {
    const definitions = await resolveBuiltInSkillTargets({
      userHomeDirectory: userHome,
      environment: {},
    });
    const ids = [...targetIds];
    const repository = new SkillTargetRepository(database, {
      createId: () => ids.shift()!,
      now: () => 400,
    });
    const seeded = repository.synchronizeBuiltInTargets(definitions);

    const result = repository.createCustomTarget({
      displayName: 'My shared Skills',
      configuredPath: definitions[0].configuredPath,
      resolvedPath: definitions[0].resolvedPath,
      resolvedPathKey: definitions[0].resolvedPathKey,
      isWritable: true,
      enabled: true,
      maxScanDepth: 5,
      allowSymlinkEscape: false,
    });

    assert.deepEqual(result, { target: seeded[0], reused: true });
    assert.equal(repository.listTargets().length, definitions.length);
  } finally {
    database.close();
    await rm(userHome, { recursive: true, force: true });
  }
});

test('resets built-in policy and removes only custom Targets', async () => {
  const userHome = await mkdtemp(path.join(tmpdir(), 'foundry-skill-target-lifecycle-'));
  const database = openFoundryDatabase(':memory:');
  const customTargetId = '00000000-0000-4000-8000-000000000310';

  try {
    const definitions = await resolveBuiltInSkillTargets({
      userHomeDirectory: userHome,
      environment: {},
    });
    const ids = [...targetIds, customTargetId];
    let now = 500;
    const repository = new SkillTargetRepository(database, {
      createId: () => ids.shift()!,
      now: () => now,
    });
    const generic = repository.synchronizeBuiltInTargets(definitions)[0];
    repository.updateTargetPolicy({
      targetId: generic.id,
      enabled: false,
      maxScanDepth: 8,
      allowSymlinkEscape: false,
    });

    now = 600;
    const reset = repository.resetBuiltInTargetPolicy(generic.id, definitions[0]);
    assert.deepEqual(reset, {
      ...generic,
      enabled: true,
      maxScanDepth: definitions[0].defaultMaxScanDepth,
      allowSymlinkEscape: definitions[0].defaultAllowSymlinkEscape,
      policySource: 'adapter-default',
      updatedAt: 600,
    });

    const customPath = path.join(userHome, 'custom-skills');
    const created = repository.createCustomTarget({
      displayName: 'Custom Skills',
      configuredPath: customPath,
      resolvedPath: customPath,
      resolvedPathKey: customPath,
      isWritable: true,
      enabled: true,
      maxScanDepth: 3,
      allowSymlinkEscape: false,
    });
    assert.equal(created.target.id, customTargetId);
    repository.removeCustomTarget(customTargetId);
    assert.equal(repository.listTargets().some((target) => target.id === customTargetId), false);
    assert.throws(() => repository.removeCustomTarget(generic.id));
  } finally {
    database.close();
    await rm(userHome, { recursive: true, force: true });
  }
});
