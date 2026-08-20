import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import type Database from 'better-sqlite3';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillInstallationRepository } from './skill-installation-repository';
import { SKILL_PACKAGE_CONTENT_FORMAT } from './skill-package-codec';

const packageId = '00000000-0000-4000-8000-000000000601';
const replacementPackageId = '00000000-0000-4000-8000-000000000602';
const targetId = '00000000-0000-4000-8000-000000000603';
const installationId = '00000000-0000-4000-8000-000000000604';
const replacementInstallationId = '00000000-0000-4000-8000-000000000605';
const fingerprint = `v2:${'a'.repeat(64)}`;
const nextFingerprint = `v2:${'b'.repeat(64)}`;

function insertPackage(database: Database.Database, id: string, contentFingerprint: string): void {
  database.prepare(`
    INSERT INTO skill_packages (
      id, distribution_name, normalized_distribution_name, content_format,
      content_fingerprint, content_blob, created_at, updated_at
    ) VALUES (?, 'example-skill', 'example-skill', ?, ?, ?, 10, 10)
  `).run(id, SKILL_PACKAGE_CONTENT_FORMAT, contentFingerprint, Buffer.from('zip'));
}

function insertTarget(database: Database.Database): void {
  database.prepare(`
    INSERT INTO skill_targets (
      id, kind, display_name, configured_path, resolved_path, resolved_path_key,
      is_built_in, is_writable, is_enabled, policy_source, max_scan_depth,
      allow_symlink_escape, sort_order, created_at, updated_at
    ) VALUES (
      ?, 'custom', 'Custom Skills', '/tmp/custom-skills', '/tmp/custom-skills',
      '/tmp/custom-skills', 0, 1, 1, 'user-override', 4, 1, 500, 10, 10
    )
  `).run(targetId);
}

test('adopts an Installation with the imported BLOB fingerprint baseline', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database, packageId, fingerprint);
    insertTarget(database);
    const repository = new SkillInstallationRepository(database, {
      createId: () => installationId,
    });
    const adopted = repository.adoptInstallation({
      packageId,
      targetId,
      distributionName: 'nested-skill',
      relativePath: 'group/nested-skill',
      fingerprint,
      importedAt: 20,
    });

    assert.equal(adopted.reused, false);
    assert.deepEqual(adopted.installation, {
      id: installationId,
      packageId,
      targetId,
      distributionName: 'nested-skill',
      relativePath: 'group/nested-skill',
      distributedFingerprint: fingerprint,
      createdAt: 20,
      updatedAt: 20,
    });
    assert.equal(repository.adoptInstallation({
      packageId,
      targetId,
      distributionName: 'nested-skill',
      relativePath: 'group/nested-skill',
      fingerprint: nextFingerprint,
      importedAt: 30,
    }).reused, true);
    assert.equal(repository.getActiveInstallation(installationId).distributedFingerprint, fingerprint);
  } finally {
    database.close();
  }
});

test('updates a distributed fingerprint and replaces another Package at one location', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database, packageId, fingerprint);
    insertPackage(database, replacementPackageId, nextFingerprint);
    insertTarget(database);
    const repository = new SkillInstallationRepository(database);
    repository.recordDistribution({
      installationId,
      packageId,
      targetId,
      distributionName: 'example-skill',
      relativePath: 'example-skill',
      fingerprint,
      distributedAt: 20,
    });
    const updated = repository.recordDistribution({
      installationId,
      packageId,
      targetId,
      distributionName: 'example-skill',
      relativePath: 'example-skill',
      fingerprint: nextFingerprint,
      distributedAt: 30,
    });
    assert.equal(updated.created, false);
    assert.equal(updated.installation.distributedFingerprint, nextFingerprint);

    repository.recordDistribution({
      installationId: replacementInstallationId,
      packageId: replacementPackageId,
      targetId,
      distributionName: 'example-skill',
      relativePath: 'example-skill',
      fingerprint: nextFingerprint,
      distributedAt: 40,
    });
    assert.equal(repository.isInstallationActive(installationId), false);
    assert.equal(repository.isInstallationActive(replacementInstallationId), true);
  } finally {
    database.close();
  }
});
