import assert from 'node:assert/strict';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillMetadataRepository } from './skill-metadata-repository';

const packageId = '00000000-0000-4000-8000-000000000101';
const revisionId = '00000000-0000-4000-8000-000000000102';
const fingerprint = 'a'.repeat(64);

test('creates an imported Skill Package and its initial revision atomically', () => {
  const database = openFoundryDatabase(':memory:');

  try {
    const repository = new SkillMetadataRepository(database);
    const result = repository.createImportedPackage({
      id: packageId,
      distributionName: 'Example Skill',
      fingerprint,
      revisionId,
      createdAt: 100,
    });

    assert.deepEqual(result, {
      package: {
        id: packageId,
        distributionName: 'Example Skill',
        storeObservation: {
          status: 'available',
          fingerprint,
          observedAt: 100,
        },
        createdAt: 100,
        updatedAt: 100,
      },
      revision: {
        id: revisionId,
        packageId,
        sequenceNumber: 1,
        fingerprint,
        reason: 'import',
        createdAt: 100,
      },
    });
    assert.deepEqual(repository.getActivePackage(packageId), result.package);
    assert.deepEqual(repository.listRevisions(packageId), [result.revision]);
  } finally {
    database.close();
  }
});

test('rolls back the Skill Package when its initial revision cannot be inserted', () => {
  const database = openFoundryDatabase(':memory:');

  try {
    database.exec(`
      CREATE TRIGGER reject_initial_revision
      BEFORE INSERT ON skill_revisions
      BEGIN
        SELECT RAISE(ABORT, 'injected revision failure');
      END;
    `);
    const repository = new SkillMetadataRepository(database);

    assert.throws(() => repository.createImportedPackage({
      id: packageId,
      distributionName: 'Example Skill',
      fingerprint,
      revisionId,
      createdAt: 100,
    }));
    assert.deepEqual(repository.listActivePackages(), []);
  } finally {
    database.close();
  }
});
