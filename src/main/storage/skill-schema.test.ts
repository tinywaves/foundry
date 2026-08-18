import assert from 'node:assert/strict';
import type Database from 'better-sqlite3';
import { test } from 'vitest';
import { openFoundryDatabase } from './foundry-database';

const firstPackageId = '00000000-0000-4000-8000-000000000001';
const secondPackageId = '00000000-0000-4000-8000-000000000002';
const targetId = '00000000-0000-4000-8000-000000000003';
const firstInstallationId = '00000000-0000-4000-8000-000000000004';
const secondInstallationId = '00000000-0000-4000-8000-000000000005';
const revisionId = '00000000-0000-4000-8000-000000000006';
const secondRevisionId = '00000000-0000-4000-8000-000000000008';
const fingerprint = 'a'.repeat(64);
const secondFingerprint = 'b'.repeat(64);

function insertPackage(
  database: Database.Database,
  id: string,
  packageFingerprint: string,
): void {
  database.prepare(`
    INSERT INTO skill_packages (
      id,
      distribution_name,
      normalized_distribution_name,
      store_observation,
      store_fingerprint,
      store_observed_at,
      created_at,
      updated_at
    ) VALUES (?, 'Shared Name', 'shared name', 'available', ?, 10, 10, 10)
  `).run(id, packageFingerprint);
}

function insertTarget(database: Database.Database): void {
  database.prepare(`
    INSERT INTO skill_targets (
      id,
      kind,
      display_name,
      configured_path,
      resolved_path,
      resolved_path_key,
      is_built_in,
      is_writable,
      is_enabled,
      policy_source,
      max_scan_depth,
      allow_symlink_escape,
      sort_order,
      created_at,
      updated_at
    ) VALUES (
      ?,
      'generic-agent-skills',
      'Agent Skills',
      '/tmp/agents/skills',
      '/tmp/agents/skills',
      '/tmp/agents/skills',
      1,
      1,
      1,
      'adapter-default',
      2,
      0,
      1,
      10,
      10
    )
  `).run(targetId);
}

function insertInstallation(
  database: Database.Database,
  id: string,
  packageId: string,
): void {
  database.prepare(`
    INSERT INTO skill_installations (
      id,
      package_id,
      target_id,
      distribution_name,
      normalized_distribution_name,
      relative_path,
      relative_path_key,
      target_observation,
      target_fingerprint,
      target_observed_at,
      created_at,
      updated_at
    ) VALUES (
      ?, ?, ?, 'Shared Name', 'shared name', 'Shared Name', 'shared name',
      'available', ?, 10, 10, 10
    )
  `).run(id, packageId, targetId, fingerprint);
}

test('allows duplicate Store names but reserves one active name per physical target', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database, firstPackageId, fingerprint);
    insertPackage(database, secondPackageId, secondFingerprint);
    insertTarget(database);
    insertInstallation(database, firstInstallationId, firstPackageId);

    assert.throws(
      () => insertInstallation(database, secondInstallationId, secondPackageId),
      (error: unknown) => (
        typeof error === 'object'
        && error !== null
        && 'code' in error
        && error.code === 'SQLITE_CONSTRAINT_UNIQUE'
      ),
    );

    database.prepare(`
      UPDATE skill_installations SET uninstalled_at = 11 WHERE id = ?
    `).run(firstInstallationId);
    insertInstallation(database, secondInstallationId, secondPackageId);

    assert.equal(
      database.prepare('SELECT COUNT(*) FROM skill_packages').pluck().get(),
      2,
    );
    assert.equal(
      database.prepare(`
        SELECT COUNT(*) FROM skill_installations WHERE uninstalled_at IS NULL
      `).pluck().get(),
      1,
    );
  } finally {
    database.close();
  }
});

test('keeps Distribution Records within one Skill Package', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database, firstPackageId, fingerprint);
    insertPackage(database, secondPackageId, secondFingerprint);
    insertTarget(database);
    insertInstallation(database, secondInstallationId, secondPackageId);
    database.prepare(`
      INSERT INTO skill_revisions (
        id, package_id, sequence_number, fingerprint, reason, created_at
      ) VALUES (?, ?, 1, ?, 'import', 10)
    `).run(revisionId, firstPackageId, fingerprint);

    assert.throws(() => database.prepare(`
      INSERT INTO skill_distribution_records (
        id,
        installation_id,
        package_id,
        revision_id,
        sequence_number,
        operation,
        fingerprint,
        created_at
      ) VALUES (?, ?, ?, ?, 1, 'adoption', ?, 10)
    `).run(
      '00000000-0000-4000-8000-000000000007',
      secondInstallationId,
      secondPackageId,
      revisionId,
      fingerprint,
    ), (error: unknown) => (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY'
    ));

    database.prepare(`
      INSERT INTO skill_revisions (
        id, package_id, sequence_number, fingerprint, reason, created_at
      ) VALUES (?, ?, 1, ?, 'import', 10)
    `).run(secondRevisionId, secondPackageId, secondFingerprint);
    database.prepare(`
      INSERT INTO skill_distribution_records (
        id,
        installation_id,
        package_id,
        revision_id,
        sequence_number,
        operation,
        fingerprint,
        created_at
      ) VALUES (?, ?, ?, ?, 1, 'adoption', ?, 10)
    `).run(
      '00000000-0000-4000-8000-000000000009',
      secondInstallationId,
      secondPackageId,
      secondRevisionId,
      secondFingerprint,
    );
    assert.equal(
      database.prepare('SELECT COUNT(*) FROM skill_distribution_records').pluck().get(),
      1,
    );
  } finally {
    database.close();
  }
});

test('rejects impossible observation facts and persists no derived installation state', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    assert.throws(() => database.prepare(`
      INSERT INTO skill_packages (
        id,
        distribution_name,
        normalized_distribution_name,
        store_observation,
        store_fingerprint,
        store_observed_at,
        created_at,
        updated_at
      ) VALUES (?, 'Broken', 'broken', 'available', NULL, 10, 10, 10)
    `).run(firstPackageId), (error: unknown) => (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && error.code === 'SQLITE_CONSTRAINT_CHECK'
    ));

    const installationColumns = new Set(database.prepare<[], { name: string }>(`
      PRAGMA table_info(skill_installations)
    `).all().map((column) => column.name));
    assert.equal(installationColumns.has('relative_path'), true);
    assert.equal(installationColumns.has('state'), false);
    assert.equal(installationColumns.has('status'), false);
  } finally {
    database.close();
  }
});
