import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillOperationError } from './skill-error';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SkillStoreCoordinator } from './skill-store-coordinator';

const firstPackageId = '00000000-0000-4000-8000-000000000201';
const secondPackageId = '00000000-0000-4000-8000-000000000202';

test('imports one immutable BLOB and reuses identical current content', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-import-'));
  const firstSource = path.join(temporaryRoot, 'first');
  const secondSource = path.join(temporaryRoot, 'second');
  const database = openFoundryDatabase(':memory:');
  try {
    await Promise.all([mkdir(firstSource), mkdir(secondSource)]);
    await Promise.all([
      writeFile(path.join(firstSource, 'SKILL.md'), '---\nname: imported-skill\n---\n'),
      writeFile(path.join(secondSource, 'SKILL.md'), '---\nname: imported-skill\n---\n'),
    ]);
    const ids = [firstPackageId, secondPackageId];
    const repository = new SkillMetadataRepository(database);
    const coordinator = new SkillStoreCoordinator(repository, {
      createId: () => ids.shift()!,
      now: () => 500,
    });

    const first = await coordinator.importPackage(firstSource);
    const second = await coordinator.importPackage(secondSource);
    assert.equal(first.reused, false);
    assert.equal(second.reused, true);
    assert.equal(second.package.id, first.package.id);
    assert.equal(first.package.distributionName, 'imported-skill');
    assert.match(first.package.fingerprint, /^v2:[0-9a-f]{64}$/);
    assert.ok(repository.getActivePackageContent(first.package.id).content.length > 0);
    assert.equal(repository.listActivePackages().length, 1);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('imports a root symbolic link as the resolved package entity', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-root-link-'));
  const source = path.join(temporaryRoot, 'source');
  const linkedRoot = path.join(temporaryRoot, 'linked-skill');
  const database = openFoundryDatabase(':memory:');
  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Linked root\n');
    await symlink(source, linkedRoot);
    const repository = new SkillMetadataRepository(database);
    const coordinator = new SkillStoreCoordinator(repository, {
      createId: () => firstPackageId,
      now: () => 600,
    });

    const imported = await coordinator.importPackage(linkedRoot);
    const verified = await coordinator.getVerifiedPackageContent(imported.package.id);
    assert.equal(verified.inspected.entries.some((entry) => (
      entry.relativePath === 'SKILL.md' && entry.kind === 'file'
    )), true);
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('maps malformed or mismatched stored BLOB content to store-corrupt', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-skill-corrupt-'));
  const source = path.join(temporaryRoot, 'source');
  const database = openFoundryDatabase(':memory:');
  try {
    await mkdir(source);
    await writeFile(path.join(source, 'SKILL.md'), '# Valid\n');
    const repository = new SkillMetadataRepository(database);
    const coordinator = new SkillStoreCoordinator(repository, {
      createId: () => firstPackageId,
    });
    await coordinator.importPackage(source);
    database.prepare(`UPDATE skill_packages SET content_blob = ? WHERE id = ?`)
      .run(Buffer.from('not-a-zip'), firstPackageId);

    await assert.rejects(
      () => coordinator.getVerifiedPackageContent(firstPackageId),
      (error: unknown) => error instanceof SkillOperationError && error.code === 'store-corrupt',
    );
  } finally {
    database.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
