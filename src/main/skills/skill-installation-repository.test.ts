import assert from 'node:assert/strict';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillInstallationRepository } from './skill-installation-repository';

const packageId = '00000000-0000-4000-8000-000000000601';
const revisionId = '00000000-0000-4000-8000-000000000602';
const targetId = '00000000-0000-4000-8000-000000000603';
const installationId = '00000000-0000-4000-8000-000000000604';
const distributionRecordId = '00000000-0000-4000-8000-000000000605';
const secondRevisionId = '00000000-0000-4000-8000-000000000606';
const secondDistributionRecordId = '00000000-0000-4000-8000-000000000607';
const rejectedDistributionRecordId = '00000000-0000-4000-8000-000000000608';
const fingerprint = 'a'.repeat(64);
const secondFingerprint = 'b'.repeat(64);

test('adopts a discovered copy with its exact initial Distribution Record baseline', () => {
  const database = openFoundryDatabase(':memory:');

  try {
    database.prepare(`
      INSERT INTO skill_packages (
        id, distribution_name, normalized_distribution_name,
        store_observation, store_fingerprint, store_observed_at, created_at, updated_at
      ) VALUES (?, 'Nested Skill', 'nested skill', 'available', ?, 10, 10, 10)
    `).run(packageId, fingerprint);
    database.prepare(`
      INSERT INTO skill_revisions (
        id, package_id, sequence_number, fingerprint, reason, created_at
      ) VALUES (?, ?, 1, ?, 'import', 10)
    `).run(revisionId, packageId, fingerprint);
    database.prepare(`
      INSERT INTO skill_targets (
        id, kind, display_name, configured_path, resolved_path, resolved_path_key,
        is_built_in, is_writable, is_enabled, policy_source, max_scan_depth,
        allow_symlink_escape, sort_order, created_at, updated_at
      ) VALUES (
        ?, 'custom', 'Custom Skills', '/tmp/custom-skills', '/tmp/custom-skills',
        '/tmp/custom-skills', 0, 1, 1, 'user-override', 4, 0, 500, 10, 10
      )
    `).run(targetId);
    const ids = [installationId, distributionRecordId];
    const repository = new SkillInstallationRepository(database, {
      createId: () => ids.shift()!,
      now: () => 10,
    });

    const adopted = repository.adoptInstallation({
      packageId,
      targetId,
      revisionId,
      distributionName: 'nested-skill',
      relativePath: 'group/nested-skill',
      fingerprint,
      observedAt: 20,
    });

    assert.equal(adopted.reused, false);
    assert.equal(adopted.installation.id, installationId);
    assert.equal(adopted.installation.relativePath, 'group/nested-skill');
    assert.deepEqual(adopted.installation.targetObservation, {
      status: 'available',
      fingerprint,
      observedAt: 20,
    });
    assert.deepEqual(adopted.distributionRecord, {
      id: distributionRecordId,
      installationId,
      packageId,
      revisionId,
      sequenceNumber: 1,
      operation: 'adoption',
      fingerprint,
      createdAt: 20,
    });
    assert.deepEqual(
      repository.getLatestDistributionRecord(installationId),
      adopted.distributionRecord,
    );
  } finally {
    database.close();
  }
});

test('commits installation observation and append-only Distribution Records atomically', () => {
  const database = openFoundryDatabase(':memory:');

  try {
    database.prepare(`
      INSERT INTO skill_packages (
        id, distribution_name, normalized_distribution_name,
        store_observation, store_fingerprint, store_observed_at, created_at, updated_at
      ) VALUES (?, 'shared-skill', 'shared-skill', 'available', ?, 10, 10, 10)
    `).run(packageId, secondFingerprint);
    database.prepare(`
      INSERT INTO skill_revisions (
        id, package_id, sequence_number, fingerprint, reason, created_at
      ) VALUES
        (?, ?, 1, ?, 'import', 10),
        (?, ?, 2, ?, 'distribution', 20)
    `).run(
      revisionId,
      packageId,
      fingerprint,
      secondRevisionId,
      packageId,
      secondFingerprint,
    );
    database.prepare(`
      INSERT INTO skill_targets (
        id, kind, display_name, configured_path, resolved_path, resolved_path_key,
        is_built_in, is_writable, is_enabled, policy_source, max_scan_depth,
        allow_symlink_escape, sort_order, created_at, updated_at
      ) VALUES (
        ?, 'custom', 'Custom Skills', '/tmp/custom-skills', '/tmp/custom-skills',
        '/tmp/custom-skills', 0, 1, 1, 'user-override', 4, 0, 500, 10, 10
      )
    `).run(targetId);
    const repository = new SkillInstallationRepository(database);

    const created = repository.recordDistribution({
      installationId,
      distributionRecordId,
      packageId,
      targetId,
      revisionId,
      distributionName: 'shared-skill',
      relativePath: 'shared-skill',
      fingerprint,
      operation: 'distribution',
      observedAt: 20,
    });
    const updated = repository.recordDistribution({
      installationId,
      distributionRecordId: secondDistributionRecordId,
      packageId,
      targetId,
      revisionId: secondRevisionId,
      distributionName: 'SHARED-SKILL',
      relativePath: 'shared-skill',
      fingerprint: secondFingerprint,
      operation: 'restore',
      observedAt: 30,
    });

    assert.equal(created.created, true);
    assert.equal(created.distributionRecord.sequenceNumber, 1);
    assert.equal(updated.created, false);
    assert.equal(updated.distributionRecord.sequenceNumber, 2);
    assert.equal(updated.distributionRecord.operation, 'restore');
    assert.deepEqual(updated.installation.targetObservation, {
      status: 'available',
      fingerprint: secondFingerprint,
      observedAt: 30,
    });

    assert.throws(() => repository.recordDistribution({
      installationId,
      distributionRecordId: rejectedDistributionRecordId,
      packageId,
      targetId,
      revisionId,
      distributionName: 'different-name',
      relativePath: 'shared-skill',
      fingerprint,
      operation: 'distribution',
      observedAt: 40,
    }));
    assert.equal(
      repository.getLatestDistributionRecord(installationId)?.id,
      secondDistributionRecordId,
    );
    assert.equal(
      database.prepare('SELECT COUNT(*) FROM skill_distribution_records').pluck().get(),
      2,
    );
    assert.deepEqual(repository.getActiveInstallation(installationId).targetObservation, {
      status: 'available',
      fingerprint: secondFingerprint,
      observedAt: 30,
    });
  } finally {
    database.close();
  }
});
