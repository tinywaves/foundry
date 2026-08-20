import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { test } from 'vitest';
import { SkillMetadataRepository } from '../skills/skill-metadata-repository';
import { fingerprintLegacySkillPackageRoot } from '../skills/skill-package-codec';
import { SkillSourceRepository } from '../skills/skill-source-repository';
import { SkillStoreCoordinator } from '../skills/skill-store-coordinator';
import {
  FOUNDRY_SCHEMA_VERSION,
  getFoundryDatabaseMigrationBackupFilename,
  initializeFoundryDatabase,
  openFoundryDatabase,
} from './foundry-database';
import type { FoundryStorageErrorCode } from './storage-error';
import { FoundryStorageError } from './storage-error';

const packageId = '00000000-0000-4000-8000-000000001201';
const currentTargetId = '00000000-0000-4000-8000-000000001202';
const staleTargetId = '00000000-0000-4000-8000-000000001203';
const currentInstallationId = '00000000-0000-4000-8000-000000001204';
const staleInstallationId = '00000000-0000-4000-8000-000000001205';
const sourceId = '00000000-0000-4000-8000-000000001206';
const legacyStaleFingerprint = 'b'.repeat(64);

function assertStorageError(
  operation: () => unknown,
  code: FoundryStorageErrorCode,
): FoundryStorageError {
  let caught: FoundryStorageError | undefined;
  assert.throws(operation, (error: unknown) => {
    if (!(error instanceof FoundryStorageError)) {
      return false;
    }
    caught = error;
    return error.code === code;
  });
  assert.ok(caught);
  return caught;
}

async function assertStorageErrorAsync(
  operation: () => Promise<unknown>,
  code: FoundryStorageErrorCode,
): Promise<void> {
  await assert.rejects(
    operation,
    (error: unknown) => error instanceof FoundryStorageError && error.code === code,
  );
}

function createLegacyV7Database(filename: string, legacyFingerprint: string): void {
  const database = new Database(filename);
  database.exec(`
    CREATE TABLE skill_packages (
      id TEXT PRIMARY KEY,
      distribution_name TEXT NOT NULL,
      normalized_distribution_name TEXT NOT NULL,
      store_observation TEXT NOT NULL,
      store_fingerprint TEXT,
      store_observed_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      trashed_at INTEGER,
      removed_at INTEGER
    );
    CREATE TABLE skill_revisions (id TEXT PRIMARY KEY);
    CREATE TABLE skill_targets (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      display_name TEXT NOT NULL,
      configured_path TEXT NOT NULL,
      resolved_path TEXT NOT NULL,
      resolved_path_key TEXT NOT NULL,
      documentation_url TEXT,
      is_built_in INTEGER NOT NULL,
      is_writable INTEGER NOT NULL,
      is_enabled INTEGER NOT NULL,
      policy_source TEXT NOT NULL,
      max_scan_depth INTEGER NOT NULL,
      allow_symlink_escape INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      removed_at INTEGER
    );
    CREATE TABLE skill_installations (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      distribution_name TEXT NOT NULL,
      normalized_distribution_name TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      relative_path_key TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      uninstalled_at INTEGER
    );
    CREATE TABLE skill_distribution_records (
      id TEXT PRIMARY KEY,
      installation_id TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      fingerprint TEXT NOT NULL
    );
    CREATE TABLE skill_sources (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      tracking_mode TEXT NOT NULL,
      source_native_id TEXT NOT NULL,
      source_identity_key TEXT NOT NULL,
      directory_provider TEXT,
      catalog_locator TEXT,
      source_url TEXT,
      skill_path TEXT,
      skill_path_key TEXT NOT NULL,
      requested_ref TEXT,
      requested_ref_key TEXT NOT NULL,
      resolved_revision TEXT NOT NULL,
      artifact_digest TEXT,
      observed_content_fingerprint TEXT NOT NULL,
      canonical_web_url TEXT NOT NULL,
      fetched_at INTEGER NOT NULL,
      check_status TEXT NOT NULL,
      last_checked_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE skill_update_candidates (id TEXT PRIMARY KEY);

    INSERT INTO skill_packages VALUES (
      '${packageId}', 'legacy-skill', 'legacy-skill', 'available',
      '${legacyFingerprint}', 10, 10, 20, NULL, NULL
    );
    INSERT INTO skill_targets VALUES (
      '${currentTargetId}', 'custom', 'Current Target', '/tmp/current', '/tmp/current',
      '/tmp/current', NULL, 0, 1, 1, 'user-override', 4, 1, 100, 10, 10, NULL
    );
    INSERT INTO skill_targets VALUES (
      '${staleTargetId}', 'custom', 'Stale Target', '/tmp/stale', '/tmp/stale',
      '/tmp/stale', NULL, 0, 1, 1, 'user-override', 4, 1, 101, 10, 10, NULL
    );
    INSERT INTO skill_installations VALUES (
      '${currentInstallationId}', '${packageId}', '${currentTargetId}', 'legacy-skill',
      'legacy-skill', 'legacy-skill', 'legacy-skill', 10, 20, NULL
    );
    INSERT INTO skill_installations VALUES (
      '${staleInstallationId}', '${packageId}', '${staleTargetId}', 'legacy-skill',
      'legacy-skill', 'legacy-skill', 'legacy-skill', 10, 20, NULL
    );
    INSERT INTO skill_distribution_records VALUES (
      '00000000-0000-4000-8000-000000001207', '${currentInstallationId}', 1,
      '${legacyStaleFingerprint}'
    );
    INSERT INTO skill_distribution_records VALUES (
      '00000000-0000-4000-8000-000000001208', '${currentInstallationId}', 2,
      '${legacyFingerprint}'
    );
    INSERT INTO skill_distribution_records VALUES (
      '00000000-0000-4000-8000-000000001209', '${staleInstallationId}', 1,
      '${legacyStaleFingerprint}'
    );
    INSERT INTO skill_sources VALUES (
      '${sourceId}', '${packageId}', 'git', 'tracked',
      'https://github.com/example/skills.git', 'https://github.com/example/skills.git',
      NULL, NULL, 'https://github.com/example/skills.git', 'legacy-skill',
      'legacy-skill', 'main', 'main', '${'1'.repeat(40)}', NULL,
      '${legacyFingerprint}', 'https://github.com/example/skills/tree/main/legacy-skill',
      20, 'current', 20, 10, 20
    );
  `);
  database.pragma('user_version = 7');
  database.close();
}

test('creates the v9 schema without removed Skill state tables or columns', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    assert.equal(FOUNDRY_SCHEMA_VERSION, 9);
    assert.equal(database.pragma('user_version', { simple: true }), 9);
    assert.equal(database.pragma('quick_check', { simple: true }), 'ok');
    const tables = database.prepare<[], { name: string }>(`
      SELECT name FROM sqlite_schema WHERE type = 'table' AND name LIKE 'skill_%' ORDER BY name
    `).all().map((row) => row.name);
    assert.deepEqual(tables, [
      'skill_installations',
      'skill_packages',
      'skill_sources',
      'skill_targets',
    ]);
  } finally {
    database.close();
  }
});

test('migrates v7 filesystem content into a verified BLOB and versioned fingerprints', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-storage-v8-migration-'));
  const filename = path.join(temporaryRoot, 'foundry.sqlite');
  const packageRoot = path.join(
    temporaryRoot,
    '.foundry',
    'skills-store',
    'packages',
    packageId,
  );
  try {
    await mkdir(packageRoot, { recursive: true });
    await writeFile(path.join(packageRoot, 'SKILL.md'), '# Legacy content\n');
    const legacyFingerprint = await fingerprintLegacySkillPackageRoot(packageRoot);
    createLegacyV7Database(filename, legacyFingerprint);

    const database = await initializeFoundryDatabase(filename, {
      userHomeDirectory: temporaryRoot,
    });
    try {
      const metadataRepository = new SkillMetadataRepository(database);
      const migrated = metadataRepository.getActivePackage(packageId);
      assert.match(migrated.fingerprint, /^v2:[0-9a-f]{64}$/);
      await new SkillStoreCoordinator(metadataRepository).getVerifiedPackageContent(packageId);
      const installations = database.prepare<[], {
        id: string;
        distributed_fingerprint: string;
      }>(`
        SELECT id, distributed_fingerprint FROM skill_installations ORDER BY id
      `).all();
      assert.deepEqual(installations, [
        { id: currentInstallationId, distributed_fingerprint: migrated.fingerprint },
        { id: staleInstallationId, distributed_fingerprint: `v1:${legacyStaleFingerprint}` },
      ]);
      assert.equal(
        new SkillSourceRepository(database).getSource(sourceId).observedContentFingerprint,
        migrated.fingerprint,
      );
    } finally {
      database.close();
    }

    const backupFilename = getFoundryDatabaseMigrationBackupFilename(filename);
    const backup = new Database(backupFilename, { readonly: true });
    assert.equal(backup.pragma('user_version', { simple: true }), 7);
    assert.equal(backup.prepare('SELECT COUNT(*) FROM skill_packages').pluck().get(), 1);
    backup.close();
    await assert.rejects(() => access(path.join(temporaryRoot, '.foundry', 'skills-store', 'packages')));

    const reopened = await initializeFoundryDatabase(filename, {
      userHomeDirectory: temporaryRoot,
    });
    assert.equal(reopened.pragma('user_version', { simple: true }), 9);
    reopened.close();
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('leaves v7 metadata and filesystem authority intact when migration preflight fails', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-storage-v8-failure-'));
  const filename = path.join(temporaryRoot, 'foundry.sqlite');
  const packageRoot = path.join(
    temporaryRoot,
    '.foundry',
    'skills-store',
    'packages',
    packageId,
  );
  try {
    await mkdir(packageRoot, { recursive: true });
    await writeFile(path.join(packageRoot, 'SKILL.md'), '# Original\n');
    const legacyFingerprint = await fingerprintLegacySkillPackageRoot(packageRoot);
    createLegacyV7Database(filename, legacyFingerprint);
    await writeFile(path.join(packageRoot, 'SKILL.md'), '# Changed before migration\n');

    await assertStorageErrorAsync(
      () => initializeFoundryDatabase(filename, { userHomeDirectory: temporaryRoot }),
      'storage-corrupt',
    );
    const unchanged = new Database(filename, { readonly: true });
    assert.equal(unchanged.pragma('user_version', { simple: true }), 7);
    assert.equal(
      unchanged.prepare('SELECT store_fingerprint FROM skill_packages WHERE id = ?')
        .pluck().get(packageId),
      legacyFingerprint,
    );
    unchanged.close();
    await access(path.join(packageRoot, 'SKILL.md'));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('requires asynchronous initialization for a v7 database with Skill content', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-storage-v8-async-'));
  const filename = path.join(temporaryRoot, 'foundry.sqlite');
  try {
    createLegacyV7Database(filename, 'a'.repeat(64));
    assertStorageError(() => openFoundryDatabase(filename), 'storage-unavailable');
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test('rejects future versions and maps unreadable database bytes without leaking details', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'foundry-storage-errors-'));
  const futureFilename = path.join(temporaryRoot, 'future.sqlite');
  const corruptFilename = path.join(temporaryRoot, 'corrupt.sqlite');
  try {
    const future = new Database(futureFilename);
    future.pragma(`user_version = ${FOUNDRY_SCHEMA_VERSION + 1}`);
    future.close();
    assertStorageError(() => openFoundryDatabase(futureFilename), 'unsupported-database-version');

    await writeFile(corruptFilename, 'not a sqlite database');
    const error = assertStorageError(() => openFoundryDatabase(corruptFilename), 'storage-corrupt');
    assert.equal(error.message.includes('not a sqlite database'), false);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
