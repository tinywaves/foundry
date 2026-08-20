import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillMetadataRepository } from './skill-metadata-repository';
import { SKILL_PACKAGE_CONTENT_FORMAT } from './skill-package-codec';

const packageId = '00000000-0000-4000-8000-000000000101';
const fingerprint = `v2:${'a'.repeat(64)}`;

test('stores one current BLOB while metadata reads omit content bytes', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    const repository = new SkillMetadataRepository(database);
    const created = repository.createImportedPackage({
      id: packageId,
      distributionName: 'example-skill',
      fingerprint,
      content: Buffer.from('encoded-content'),
      createdAt: 100,
    });

    assert.deepEqual(created, {
      id: packageId,
      distributionName: 'example-skill',
      fingerprint,
      createdAt: 100,
      updatedAt: 100,
    });
    assert.equal('content' in repository.listActivePackages()[0], false);
    assert.deepEqual(repository.getActivePackageContent(packageId), {
      ...created,
      format: SKILL_PACKAGE_CONTENT_FORMAT,
      content: Buffer.from('encoded-content'),
    });
  } finally {
    database.close();
  }
});

test('logically removes a trashed Package without deleting its BLOB', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    const repository = new SkillMetadataRepository(database);
    repository.createImportedPackage({
      id: packageId,
      distributionName: 'example-skill',
      fingerprint,
      content: Buffer.from('retained-content'),
      createdAt: 100,
    });
    repository.commitStoreDeletion(packageId, 200);
    repository.markTrashedPackageRemoved(packageId, 300);

    assert.equal(repository.isPackageRemoved(packageId), true);
    assert.deepEqual(repository.listActivePackages(), []);
    assert.deepEqual(repository.listTrashedPackages(), []);
    const retained = database.prepare<[string], Buffer>(`
      SELECT content_blob FROM skill_packages WHERE id = ?
    `).pluck().get(packageId);
    assert.deepEqual(retained, Buffer.from('retained-content'));
  } finally {
    database.close();
  }
});
