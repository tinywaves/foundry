import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import type Database from 'better-sqlite3';
import { test } from 'vitest';
import { SKILL_PACKAGE_CONTENT_FORMAT } from '../skills/skill-package-codec';
import { openFoundryDatabase } from './foundry-database';

const firstPackageId = '00000000-0000-4000-8000-000000000001';
const secondPackageId = '00000000-0000-4000-8000-000000000002';
const targetId = '00000000-0000-4000-8000-000000000003';
const firstInstallationId = '00000000-0000-4000-8000-000000000004';
const secondInstallationId = '00000000-0000-4000-8000-000000000005';
const fingerprint = `v2:${'a'.repeat(64)}`;
const secondFingerprint = `v2:${'b'.repeat(64)}`;

function insertPackage(
  database: Database.Database,
  id: string,
  contentFingerprint: string,
): void {
  database.prepare(`
    INSERT INTO skill_packages (
      id, distribution_name, normalized_distribution_name, content_format,
      content_fingerprint, content_blob, created_at, updated_at
    ) VALUES (?, 'Shared Name', 'shared name', ?, ?, ?, 10, 10)
  `).run(id, SKILL_PACKAGE_CONTENT_FORMAT, contentFingerprint, Buffer.from('blob'));
}

function insertTarget(database: Database.Database): void {
  database.prepare(`
    INSERT INTO skill_targets (
      id, kind, display_name, configured_path, resolved_path, resolved_path_key,
      is_built_in, is_writable, is_enabled, policy_source, max_scan_depth,
      allow_symlink_escape, sort_order, created_at, updated_at
    ) VALUES (
      ?, 'generic-agent-skills', 'Agent Skills', '/tmp/agents/skills',
      '/tmp/agents/skills', '/tmp/agents/skills', 1, 1, 1, 'adapter-default',
      2, 1, 1, 10, 10
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
      id, package_id, target_id, distribution_name, normalized_distribution_name,
      relative_path, relative_path_key, distributed_fingerprint, created_at, updated_at
    ) VALUES (?, ?, ?, 'Shared Name', 'shared name', 'Shared Name', 'shared name', ?, 10, 10)
  `).run(id, packageId, targetId, fingerprint);
}

test('allows duplicate Store names but reserves one active Target destination', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database, firstPackageId, fingerprint);
    insertPackage(database, secondPackageId, secondFingerprint);
    insertTarget(database);
    insertInstallation(database, firstInstallationId, firstPackageId);
    assert.throws(
      () => insertInstallation(database, secondInstallationId, secondPackageId),
      (error: unknown) => typeof error === 'object'
        && error !== null
        && 'code' in error
        && error.code === 'SQLITE_CONSTRAINT_UNIQUE',
    );
    database.prepare(`UPDATE skill_installations SET uninstalled_at = 11 WHERE id = ?`)
      .run(firstInstallationId);
    insertInstallation(database, secondInstallationId, secondPackageId);
    assert.equal(database.prepare(`
      SELECT COUNT(*) FROM skill_installations WHERE uninstalled_at IS NULL
    `).pluck().get(), 1);
  } finally {
    database.close();
  }
});

test('stores one BLOB and Distributed Fingerprint without removed history tables', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database, firstPackageId, fingerprint);
    insertTarget(database);
    insertInstallation(database, firstInstallationId, firstPackageId);
    const skillTables = database.prepare<[], { name: string }>(`
      SELECT name FROM sqlite_schema WHERE type = 'table' AND name LIKE 'skill_%' ORDER BY name
    `).all().map((row) => row.name);
    assert.deepEqual(skillTables, [
      'skill_installations',
      'skill_packages',
      'skill_sources',
      'skill_targets',
    ]);
    const packageColumns = new Set(database.prepare<[], { name: string }>(`
      PRAGMA table_info(skill_packages)
    `).all().map((column) => column.name));
    assert.equal(packageColumns.has('content_blob'), true);
    assert.equal(packageColumns.has('store_observation'), false);
    const installationColumns = new Set(database.prepare<[], { name: string }>(`
      PRAGMA table_info(skill_installations)
    `).all().map((column) => column.name));
    assert.equal(installationColumns.has('distributed_fingerprint'), true);
    assert.equal(installationColumns.has('target_observation'), false);
  } finally {
    database.close();
  }
});

test('rejects unversioned fingerprints and empty BLOB content', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    assert.throws(() => database.prepare(`
      INSERT INTO skill_packages (
        id, distribution_name, normalized_distribution_name, content_format,
        content_fingerprint, content_blob, created_at, updated_at
      ) VALUES (?, 'Broken', 'broken', ?, ?, ?, 10, 10)
    `).run(
      firstPackageId,
      SKILL_PACKAGE_CONTENT_FORMAT,
      'a'.repeat(64),
      Buffer.alloc(0),
    ), (error: unknown) => typeof error === 'object'
      && error !== null
      && 'code' in error
      && error.code === 'SQLITE_CONSTRAINT_CHECK');
  } finally {
    database.close();
  }
});
