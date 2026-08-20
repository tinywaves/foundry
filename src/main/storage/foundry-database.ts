import Database from 'better-sqlite3';
import type { Buffer } from 'node:buffer';
import { access, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  SKILL_TARGET_MAX_SCAN_DEPTH,
  skillSourceCheckStatuses,
  skillSourceProviders,
  skillSourceTrackingModes,
  skillTargetKinds,
  skillTargetPolicySources,
} from '../../shared/skill-contract';
import {
  encodeSkillPackage,
  fingerprintLegacySkillPackageRoot,
  inspectSkillPackage,
  SKILL_PACKAGE_CONTENT_FORMAT,
} from '../skills/skill-package-codec';
import { readSkillPackageManifest } from '../skills/skill-package-manifest';
import { FoundryStorageError, toFoundryStorageError } from './storage-error';

export const FOUNDRY_SCHEMA_VERSION = 9;

const legacySkillRevisionReasons = ['import', 'distribution', 'promotion', 'remote-update'] as const;
const legacySkillDistributionOperations = ['adoption', 'distribution', 'restore'] as const;
const legacySkillContentObservationStatuses = ['available', 'missing', 'unreadable'] as const;

const initialProviderSchema = `
  CREATE TABLE providers (
    id TEXT PRIMARY KEY NOT NULL,
    runtime TEXT NOT NULL CHECK (runtime IN ('codex', 'claude-code')),
    provider_source TEXT NOT NULL CHECK (provider_source IN ('user-custom', 'foundry-built-in')),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    base_url TEXT NOT NULL,
    api_key TEXT,
    remark TEXT,
    official_website TEXT,
    avatar_mime_type TEXT CHECK (
      avatar_mime_type IS NULL OR avatar_mime_type IN ('image/png', 'image/jpeg', 'image/webp')
    ),
    avatar_data BLOB,
    model_config_version INTEGER NOT NULL CHECK (model_config_version > 0),
    model_config_json TEXT NOT NULL CHECK (json_valid(model_config_json)),
    connection_status TEXT NOT NULL DEFAULT 'never-tested'
      CHECK (connection_status IN ('never-tested', 'connected', 'failed')),
    last_tested_at INTEGER,
    last_test_error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    CHECK ((avatar_mime_type IS NULL) = (avatar_data IS NULL)),
    CHECK (
      (connection_status = 'never-tested' AND last_tested_at IS NULL AND last_test_error IS NULL)
      OR (connection_status = 'connected' AND last_tested_at IS NOT NULL AND last_test_error IS NULL)
      OR (connection_status = 'failed' AND last_tested_at IS NOT NULL AND last_test_error IS NOT NULL)
    )
  );

  CREATE INDEX providers_active_runtime_created_idx
    ON providers (runtime, deleted_at, created_at DESC);
`;

const runtimeApplicationSchema = `
  CREATE TABLE runtime_applications (
    runtime TEXT PRIMARY KEY NOT NULL CHECK (runtime IN ('codex', 'claude-code')),
    target_kind TEXT NOT NULL CHECK (target_kind IN ('provider', 'official-default')),
    provider_id TEXT REFERENCES providers (id),
    applied_at INTEGER NOT NULL CHECK (applied_at >= 0),
    CHECK (
      (target_kind = 'provider' AND provider_id IS NOT NULL)
      OR (target_kind = 'official-default' AND provider_id IS NULL)
    )
  );

  CREATE INDEX runtime_applications_provider_idx
    ON runtime_applications (provider_id)
    WHERE provider_id IS NOT NULL;
`;

const promptSchema = `
  CREATE TABLE prompts (
    id TEXT PRIMARY KEY NOT NULL,
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
    trashed_at INTEGER CHECK (trashed_at IS NULL OR trashed_at >= 0),
    removed_at INTEGER CHECK (removed_at IS NULL OR removed_at >= 0),
    CHECK (removed_at IS NULL OR trashed_at IS NOT NULL)
  );

  CREATE TABLE prompt_versions (
    prompt_id TEXT NOT NULL REFERENCES prompts (id),
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    content TEXT NOT NULL CHECK (length(trim(content)) > 0),
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    PRIMARY KEY (prompt_id, version_number)
  );

  CREATE INDEX prompts_active_updated_idx
    ON prompts (updated_at DESC, id)
    WHERE trashed_at IS NULL AND removed_at IS NULL;

  CREATE INDEX prompts_trash_trashed_idx
    ON prompts (trashed_at DESC, id)
    WHERE trashed_at IS NOT NULL AND removed_at IS NULL;
`;

const applicationSettingsSchema = `
  CREATE TABLE application_settings (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    color_mode TEXT NOT NULL CHECK (color_mode IN ('light', 'dark', 'system'))
  );
`;

const skillSchema = `
  CREATE TABLE skill_packages (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    distribution_name TEXT NOT NULL CHECK (
      length(distribution_name) > 0 AND length(distribution_name) <= 255
    ),
    normalized_distribution_name TEXT NOT NULL CHECK (
      length(normalized_distribution_name) > 0
      AND length(normalized_distribution_name) <= 255
    ),
    store_observation TEXT NOT NULL CHECK (
      store_observation IN (${toSqlStringList(legacySkillContentObservationStatuses)})
    ),
    store_fingerprint TEXT CHECK (
      store_fingerprint IS NULL OR (
        length(store_fingerprint) = 64
        AND store_fingerprint NOT GLOB '*[^0-9a-f]*'
      )
    ),
    store_observed_at INTEGER NOT NULL CHECK (store_observed_at >= 0),
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
    trashed_at INTEGER CHECK (trashed_at IS NULL OR trashed_at >= created_at),
    removed_at INTEGER CHECK (removed_at IS NULL OR removed_at >= trashed_at),
    CHECK (
      (store_observation = 'available' AND store_fingerprint IS NOT NULL)
      OR (store_observation != 'available' AND store_fingerprint IS NULL)
    ),
    CHECK (removed_at IS NULL OR trashed_at IS NOT NULL)
  );

  CREATE TABLE skill_revisions (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    package_id TEXT NOT NULL REFERENCES skill_packages (id),
    sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
    fingerprint TEXT NOT NULL CHECK (
      length(fingerprint) = 64 AND fingerprint NOT GLOB '*[^0-9a-f]*'
    ),
    reason TEXT NOT NULL CHECK (reason IN (${toSqlStringList(legacySkillRevisionReasons)})),
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    UNIQUE (package_id, sequence_number),
    UNIQUE (id, package_id, fingerprint)
  );

  CREATE TABLE skill_targets (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    kind TEXT NOT NULL CHECK (kind IN (${toSqlStringList(skillTargetKinds)})),
    display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
    configured_path TEXT NOT NULL CHECK (length(configured_path) > 0),
    resolved_path TEXT NOT NULL CHECK (length(resolved_path) > 0),
    resolved_path_key TEXT NOT NULL CHECK (length(resolved_path_key) > 0),
    documentation_url TEXT,
    is_built_in INTEGER NOT NULL CHECK (is_built_in IN (0, 1)),
    is_writable INTEGER NOT NULL CHECK (is_writable IN (0, 1)),
    is_enabled INTEGER NOT NULL CHECK (is_enabled IN (0, 1)),
    policy_source TEXT NOT NULL CHECK (
      policy_source IN (${toSqlStringList(skillTargetPolicySources)})
    ),
    max_scan_depth INTEGER NOT NULL CHECK (
      max_scan_depth BETWEEN 1 AND ${SKILL_TARGET_MAX_SCAN_DEPTH}
    ),
    allow_symlink_escape INTEGER NOT NULL CHECK (allow_symlink_escape IN (0, 1)),
    sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
    removed_at INTEGER CHECK (removed_at IS NULL OR removed_at >= created_at),
    CHECK (
      (is_built_in = 1 AND kind != 'custom')
      OR (is_built_in = 0 AND kind = 'custom')
    ),
    CHECK (removed_at IS NULL OR is_built_in = 0)
  );

  CREATE TABLE skill_installations (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    package_id TEXT NOT NULL REFERENCES skill_packages (id),
    target_id TEXT NOT NULL REFERENCES skill_targets (id),
    distribution_name TEXT NOT NULL CHECK (
      length(distribution_name) > 0 AND length(distribution_name) <= 255
    ),
    normalized_distribution_name TEXT NOT NULL CHECK (
      length(normalized_distribution_name) > 0
      AND length(normalized_distribution_name) <= 255
    ),
    target_observation TEXT NOT NULL CHECK (
      target_observation IN (${toSqlStringList(legacySkillContentObservationStatuses)})
    ),
    target_fingerprint TEXT CHECK (
      target_fingerprint IS NULL OR (
        length(target_fingerprint) = 64
        AND target_fingerprint NOT GLOB '*[^0-9a-f]*'
      )
    ),
    target_observed_at INTEGER NOT NULL CHECK (target_observed_at >= 0),
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
    uninstalled_at INTEGER CHECK (
      uninstalled_at IS NULL OR uninstalled_at >= created_at
    ),
    CHECK (
      (target_observation = 'available' AND target_fingerprint IS NOT NULL)
      OR (target_observation != 'available' AND target_fingerprint IS NULL)
    ),
    UNIQUE (id, package_id)
  );

  CREATE TABLE skill_distribution_records (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    installation_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    revision_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
    operation TEXT NOT NULL CHECK (
      operation IN (${toSqlStringList(legacySkillDistributionOperations)})
    ),
    fingerprint TEXT NOT NULL CHECK (
      length(fingerprint) = 64 AND fingerprint NOT GLOB '*[^0-9a-f]*'
    ),
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    UNIQUE (installation_id, sequence_number),
    FOREIGN KEY (installation_id, package_id)
      REFERENCES skill_installations (id, package_id),
    FOREIGN KEY (revision_id, package_id, fingerprint)
      REFERENCES skill_revisions (id, package_id, fingerprint)
  );

  CREATE INDEX skill_packages_active_updated_idx
    ON skill_packages (updated_at DESC, id)
    WHERE trashed_at IS NULL AND removed_at IS NULL;

  CREATE INDEX skill_packages_active_fingerprint_idx
    ON skill_packages (store_fingerprint)
    WHERE trashed_at IS NULL
      AND removed_at IS NULL
      AND store_observation = 'available';

  CREATE INDEX skill_revisions_package_sequence_idx
    ON skill_revisions (package_id, sequence_number DESC);

  CREATE UNIQUE INDEX skill_targets_active_resolved_path_idx
    ON skill_targets (resolved_path_key)
    WHERE removed_at IS NULL;

  CREATE INDEX skill_targets_active_order_idx
    ON skill_targets (sort_order, display_name, id)
    WHERE removed_at IS NULL;

  CREATE UNIQUE INDEX skill_installations_active_name_idx
    ON skill_installations (target_id, normalized_distribution_name)
    WHERE uninstalled_at IS NULL;

  CREATE INDEX skill_installations_package_idx
    ON skill_installations (package_id, uninstalled_at, updated_at DESC);

  CREATE INDEX skill_installations_target_idx
    ON skill_installations (target_id, uninstalled_at, distribution_name);

  CREATE INDEX skill_distribution_records_latest_idx
    ON skill_distribution_records (installation_id, sequence_number DESC);
`;

const skillInstallationLocationSchema = `
  ALTER TABLE skill_installations
    ADD COLUMN relative_path TEXT NOT NULL DEFAULT '';
  ALTER TABLE skill_installations
    ADD COLUMN relative_path_key TEXT NOT NULL DEFAULT '';

  UPDATE skill_installations
  SET relative_path = distribution_name,
      relative_path_key = normalized_distribution_name;

  CREATE TRIGGER skill_installations_relative_path_insert_check
  BEFORE INSERT ON skill_installations
  WHEN length(NEW.relative_path) = 0 OR length(NEW.relative_path_key) = 0
  BEGIN
    SELECT RAISE(ABORT, 'invalid Skill Installation relative path');
  END;

  CREATE TRIGGER skill_installations_relative_path_update_check
  BEFORE UPDATE OF relative_path, relative_path_key ON skill_installations
  WHEN length(NEW.relative_path) = 0 OR length(NEW.relative_path_key) = 0
  BEGIN
    SELECT RAISE(ABORT, 'invalid Skill Installation relative path');
  END;

  CREATE UNIQUE INDEX skill_installations_active_relative_path_idx
    ON skill_installations (target_id, relative_path_key)
    WHERE uninstalled_at IS NULL;
`;

const remoteSkillSourceSchema = `
  CREATE TABLE skill_sources (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    package_id TEXT NOT NULL REFERENCES skill_packages (id),
    provider TEXT NOT NULL CHECK (
      provider IN (${toSqlStringList(skillSourceProviders)})
    ),
    tracking_mode TEXT NOT NULL CHECK (
      tracking_mode IN (${toSqlStringList(skillSourceTrackingModes)})
    ),
    source_native_id TEXT NOT NULL CHECK (
      length(source_native_id) > 0 AND length(source_native_id) <= 4096
    ),
    source_identity_key TEXT NOT NULL CHECK (
      length(source_identity_key) > 0 AND length(source_identity_key) <= 4096
    ),
    directory_provider TEXT CHECK (
      directory_provider IS NULL OR directory_provider = 'skills-sh'
    ),
    catalog_locator TEXT CHECK (
      catalog_locator IS NULL OR (
        length(catalog_locator) > 0 AND length(catalog_locator) <= 4096
      )
    ),
    source_url TEXT CHECK (
      source_url IS NULL OR (length(source_url) > 0 AND length(source_url) <= 4096)
    ),
    skill_path TEXT CHECK (
      skill_path IS NULL OR (length(skill_path) > 0 AND length(skill_path) <= 4096)
    ),
    skill_path_key TEXT NOT NULL CHECK (length(skill_path_key) <= 4096),
    requested_ref TEXT CHECK (
      requested_ref IS NULL OR (length(requested_ref) > 0 AND length(requested_ref) <= 1024)
    ),
    requested_ref_key TEXT NOT NULL CHECK (length(requested_ref_key) <= 1024),
    resolved_revision TEXT NOT NULL CHECK (
      length(resolved_revision) > 0 AND length(resolved_revision) <= 1024
    ),
    artifact_digest TEXT CHECK (
      artifact_digest IS NULL OR (
        length(artifact_digest) = 64
        AND artifact_digest NOT GLOB '*[^0-9a-f]*'
      )
    ),
    observed_content_fingerprint TEXT NOT NULL CHECK (
      length(observed_content_fingerprint) = 64
      AND observed_content_fingerprint NOT GLOB '*[^0-9a-f]*'
    ),
    canonical_web_url TEXT NOT NULL CHECK (
      length(canonical_web_url) > 0 AND length(canonical_web_url) <= 4096
    ),
    fetched_at INTEGER NOT NULL CHECK (fetched_at >= 0),
    check_status TEXT NOT NULL DEFAULT 'never' CHECK (
      check_status IN (${toSqlStringList(skillSourceCheckStatuses)})
    ),
    last_checked_at INTEGER CHECK (last_checked_at IS NULL OR last_checked_at >= 0),
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
    CHECK (
      (check_status = 'never' AND last_checked_at IS NULL)
      OR (check_status != 'never' AND last_checked_at IS NOT NULL)
    ),
    CHECK (
      (provider = 'git' AND source_url IS NOT NULL)
      OR provider != 'git'
    ),
    CHECK (
      (directory_provider IS NULL AND catalog_locator IS NULL)
      OR (directory_provider IS NOT NULL AND catalog_locator IS NOT NULL)
    ),
    UNIQUE (id, package_id),
    UNIQUE (
      provider,
      source_identity_key,
      skill_path_key,
      requested_ref_key
    )
  );

  CREATE TABLE skill_update_candidates (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    source_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    resolved_revision TEXT NOT NULL CHECK (
      length(resolved_revision) > 0 AND length(resolved_revision) <= 1024
    ),
    artifact_digest TEXT CHECK (
      artifact_digest IS NULL OR (
        length(artifact_digest) = 64
        AND artifact_digest NOT GLOB '*[^0-9a-f]*'
      )
    ),
    canonical_web_url TEXT NOT NULL CHECK (
      length(canonical_web_url) > 0 AND length(canonical_web_url) <= 4096
    ),
    checked_at INTEGER NOT NULL CHECK (checked_at >= 0),
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    UNIQUE (source_id),
    FOREIGN KEY (source_id, package_id)
      REFERENCES skill_sources (id, package_id)
  );

  CREATE INDEX skill_sources_package_idx
    ON skill_sources (package_id, created_at, id);

  CREATE INDEX skill_sources_check_idx
    ON skill_sources (check_status, last_checked_at DESC);

  CREATE INDEX skill_update_candidates_package_idx
    ON skill_update_candidates (package_id, checked_at DESC);
`;

const currentSkillSchema = `
  CREATE TABLE skill_packages_v8 (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    distribution_name TEXT NOT NULL CHECK (
      length(distribution_name) > 0 AND length(distribution_name) <= 255
    ),
    description TEXT,
    normalized_distribution_name TEXT NOT NULL CHECK (
      length(normalized_distribution_name) > 0
      AND length(normalized_distribution_name) <= 255
    ),
    content_format TEXT NOT NULL CHECK (content_format = '${SKILL_PACKAGE_CONTENT_FORMAT}'),
    content_fingerprint TEXT NOT NULL CHECK (
      length(content_fingerprint) = 67
      AND substr(content_fingerprint, 1, 3) = 'v2:'
      AND substr(content_fingerprint, 4) NOT GLOB '*[^0-9a-f]*'
    ),
    content_blob BLOB NOT NULL CHECK (
      typeof(content_blob) = 'blob' AND length(content_blob) > 0
    ),
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
    trashed_at INTEGER CHECK (trashed_at IS NULL OR trashed_at >= created_at),
    removed_at INTEGER CHECK (removed_at IS NULL OR removed_at >= trashed_at),
    CHECK (removed_at IS NULL OR trashed_at IS NOT NULL)
  );

  CREATE TABLE skill_installations_v8 (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    package_id TEXT NOT NULL REFERENCES skill_packages_v8 (id),
    target_id TEXT NOT NULL REFERENCES skill_targets (id),
    distribution_name TEXT NOT NULL CHECK (
      length(distribution_name) > 0 AND length(distribution_name) <= 255
    ),
    normalized_distribution_name TEXT NOT NULL CHECK (
      length(normalized_distribution_name) > 0
      AND length(normalized_distribution_name) <= 255
    ),
    relative_path TEXT NOT NULL CHECK (length(relative_path) > 0),
    relative_path_key TEXT NOT NULL CHECK (length(relative_path_key) > 0),
    distributed_fingerprint TEXT NOT NULL CHECK (
      length(distributed_fingerprint) = 67
      AND substr(distributed_fingerprint, 1, 3) IN ('v1:', 'v2:')
      AND substr(distributed_fingerprint, 4) NOT GLOB '*[^0-9a-f]*'
    ),
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
    uninstalled_at INTEGER CHECK (
      uninstalled_at IS NULL OR uninstalled_at >= created_at
    )
  );

  CREATE TABLE skill_sources_v8 (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    package_id TEXT NOT NULL REFERENCES skill_packages_v8 (id),
    provider TEXT NOT NULL CHECK (
      provider IN (${toSqlStringList(skillSourceProviders)})
    ),
    tracking_mode TEXT NOT NULL CHECK (
      tracking_mode IN (${toSqlStringList(skillSourceTrackingModes)})
    ),
    source_native_id TEXT NOT NULL CHECK (
      length(source_native_id) > 0 AND length(source_native_id) <= 4096
    ),
    source_identity_key TEXT NOT NULL CHECK (
      length(source_identity_key) > 0 AND length(source_identity_key) <= 4096
    ),
    directory_provider TEXT CHECK (
      directory_provider IS NULL OR directory_provider = 'skills-sh'
    ),
    catalog_locator TEXT CHECK (
      catalog_locator IS NULL OR (
        length(catalog_locator) > 0 AND length(catalog_locator) <= 4096
      )
    ),
    source_url TEXT CHECK (
      source_url IS NULL OR (length(source_url) > 0 AND length(source_url) <= 4096)
    ),
    skill_path TEXT CHECK (
      skill_path IS NULL OR (length(skill_path) > 0 AND length(skill_path) <= 4096)
    ),
    skill_path_key TEXT NOT NULL CHECK (length(skill_path_key) <= 4096),
    requested_ref TEXT CHECK (
      requested_ref IS NULL OR (length(requested_ref) > 0 AND length(requested_ref) <= 1024)
    ),
    requested_ref_key TEXT NOT NULL CHECK (length(requested_ref_key) <= 1024),
    resolved_revision TEXT NOT NULL CHECK (
      length(resolved_revision) > 0 AND length(resolved_revision) <= 1024
    ),
    artifact_digest TEXT CHECK (
      artifact_digest IS NULL OR (
        length(artifact_digest) = 64
        AND artifact_digest NOT GLOB '*[^0-9a-f]*'
      )
    ),
    observed_content_fingerprint TEXT NOT NULL CHECK (
      length(observed_content_fingerprint) = 67
      AND substr(observed_content_fingerprint, 1, 3) IN ('v1:', 'v2:')
      AND substr(observed_content_fingerprint, 4) NOT GLOB '*[^0-9a-f]*'
    ),
    canonical_web_url TEXT NOT NULL CHECK (
      length(canonical_web_url) > 0 AND length(canonical_web_url) <= 4096
    ),
    fetched_at INTEGER NOT NULL CHECK (fetched_at >= 0),
    created_at INTEGER NOT NULL CHECK (created_at >= 0),
    updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
    UNIQUE (id, package_id),
    UNIQUE (
      provider,
      source_identity_key,
      skill_path_key,
      requested_ref_key
    )
  );
`;

const currentSkillIndexes = `
  CREATE INDEX skill_packages_active_updated_idx
    ON skill_packages (updated_at DESC, id)
    WHERE trashed_at IS NULL AND removed_at IS NULL;

  CREATE INDEX skill_packages_active_fingerprint_idx
    ON skill_packages (content_fingerprint)
    WHERE trashed_at IS NULL AND removed_at IS NULL;

  CREATE UNIQUE INDEX skill_installations_active_name_idx
    ON skill_installations (target_id, normalized_distribution_name)
    WHERE uninstalled_at IS NULL;

  CREATE UNIQUE INDEX skill_installations_active_relative_path_idx
    ON skill_installations (target_id, relative_path_key)
    WHERE uninstalled_at IS NULL;

  CREATE INDEX skill_installations_package_idx
    ON skill_installations (package_id, uninstalled_at, updated_at DESC);

  CREATE INDEX skill_installations_target_idx
    ON skill_installations (target_id, uninstalled_at, distribution_name);

  CREATE INDEX skill_sources_package_idx
    ON skill_sources (package_id, created_at, id);
`;

interface LegacySkillPackageRow {
  id: string;
  distribution_name: string;
  store_observation: string;
  store_fingerprint: string | null;
  created_at: number;
  updated_at: number;
  trashed_at: number | null;
  removed_at: number | null;
}

interface LegacySkillInstallationRow {
  id: string;
  package_id: string;
  target_id: string;
  distribution_name: string;
  normalized_distribution_name: string;
  relative_path: string;
  relative_path_key: string;
  created_at: number;
  updated_at: number;
  latest_fingerprint: string | null;
}

interface LegacySkillSourceRow {
  id: string;
  package_id: string;
  provider: string;
  tracking_mode: string;
  source_native_id: string;
  source_identity_key: string;
  directory_provider: string | null;
  catalog_locator: string | null;
  source_url: string | null;
  skill_path: string | null;
  skill_path_key: string;
  requested_ref: string | null;
  requested_ref_key: string;
  resolved_revision: string;
  artifact_digest: string | null;
  observed_content_fingerprint: string;
  canonical_web_url: string;
  fetched_at: number;
  created_at: number;
  updated_at: number;
}

interface PreparedSkillPackage extends LegacySkillPackageRow {
  content: Buffer;
  contentFingerprint: string;
  description: string | null;
}

interface PreparedSkillInstallation extends LegacySkillInstallationRow {
  distributedFingerprint: string;
}

interface PreparedSkillSource extends LegacySkillSourceRow {
  observedContentFingerprint: string;
}

interface PreparedSkillMigration {
  packages: PreparedSkillPackage[];
  installations: PreparedSkillInstallation[];
  sources: PreparedSkillSource[];
}

export interface FoundryDatabaseInitializationOptions {
  userHomeDirectory: string;
}

interface Migration {
  version: number;
  apply: (database: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    apply: (database) => database.exec(initialProviderSchema),
  },
  {
    version: 2,
    apply: (database) => database.exec(runtimeApplicationSchema),
  },
  {
    version: 3,
    apply: (database) => database.exec(promptSchema),
  },
  {
    version: 4,
    apply: (database) => database.exec(applicationSettingsSchema),
  },
  {
    version: 5,
    apply: (database) => database.exec(skillSchema),
  },
  {
    version: 6,
    apply: (database) => database.exec(skillInstallationLocationSchema),
  },
  {
    version: 7,
    apply: (database) => database.exec(remoteSkillSourceSchema),
  },
  {
    version: 9,
    apply: (database) => {
      database.exec('ALTER TABLE skill_packages ADD COLUMN description TEXT');
    },
  },
];

function toSqlStringList(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(', ');
}

export function openFoundryDatabase(filename: string): Database.Database {
  let database: Database.Database | undefined;
  try {
    database = new Database(filename, { timeout: 5000 });
    configureDatabase(database);
    applyMigrations(database);
    if (getDatabaseVersion(database) === 7) {
      if (countLegacySkillPackages(database) > 0) {
        throw new FoundryStorageError(
          'storage-unavailable',
          'Foundry storage requires asynchronous Skill content migration.',
        );
      }
      replaceSkillSchema(database, { packages: [], installations: [], sources: [] });
    }
    assertDatabaseConsistency(database);
    return database;
  } catch (error) {
    database?.close();
    throw toFoundryStorageError(error);
  }
}

export async function initializeFoundryDatabase(
  filename: string,
  options: FoundryDatabaseInitializationOptions,
): Promise<Database.Database> {
  let database: Database.Database | undefined;
  try {
    if (!path.isAbsolute(options.userHomeDirectory)) {
      throw new FoundryStorageError(
        'storage-unavailable',
        'The Foundry user home directory must be absolute.',
      );
    }
    database = new Database(filename, { timeout: 5000 });
    configureDatabase(database);
    const initialVersion = getDatabaseVersion(database);
    applyMigrations(database);
    if (getDatabaseVersion(database) === 7) {
      const packageCount = countLegacySkillPackages(database);
      if (packageCount === 0) {
        replaceSkillSchema(database, { packages: [], installations: [], sources: [] });
      } else {
        await createPreMigrationBackup(database, filename);
        const prepared = await prepareSkillMigration(database, options.userHomeDirectory);
        replaceSkillSchema(database, prepared);
      }
    }
    if (initialVersion >= 8) {
      await backfillSkillPackageDescriptions(database);
    }
    assertDatabaseConsistency(database);
    await cleanupLegacySkillStore(options.userHomeDirectory);
    return database;
  } catch (error) {
    database?.close();
    throw toFoundryStorageError(error);
  }
}

export function getFoundryDatabaseMigrationBackupFilename(filename: string): string {
  return `${filename}.pre-v8-backup`;
}

function configureDatabase(database: Database.Database): void {
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');
  database.pragma('synchronous = NORMAL');
}

function applyMigrations(database: Database.Database): void {
  const currentVersion = getDatabaseVersion(database);
  if (currentVersion > FOUNDRY_SCHEMA_VERSION) {
    throw new FoundryStorageError(
      'unsupported-database-version',
      'Foundry storage was created by a newer Foundry version.',
    );
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }
    // Version 7 databases must be converted through the asynchronous package
    // migration before the current schema can receive version 9 metadata.
    if (migration.version === 9 && currentVersion < 8) {
      continue;
    }
    database.transaction(() => {
      migration.apply(database);
      database.pragma(`user_version = ${migration.version}`);
    }).immediate();
  }
}

function getDatabaseVersion(database: Database.Database): number {
  const currentVersion = database.pragma('user_version', { simple: true });
  if (typeof currentVersion !== 'number' || !Number.isSafeInteger(currentVersion)) {
    throw new FoundryStorageError('storage-corrupt', 'Foundry database version is invalid.');
  }
  return currentVersion;
}

function countLegacySkillPackages(database: Database.Database): number {
  return database.prepare<[], number>(`
    SELECT COUNT(*) FROM skill_packages WHERE removed_at IS NULL
  `).pluck().get() ?? 0;
}

async function createPreMigrationBackup(
  database: Database.Database,
  filename: string,
): Promise<void> {
  if (filename === ':memory:') {
    throw new FoundryStorageError(
      'storage-unavailable',
      'An in-memory database with legacy Skill content cannot be migrated.',
    );
  }
  const backupFilename = getFoundryDatabaseMigrationBackupFilename(filename);
  if (await pathExists(backupFilename)) {
    assertMigrationBackup(backupFilename);
    return;
  }
  await database.backup(backupFilename);
  assertMigrationBackup(backupFilename);
}

function assertMigrationBackup(filename: string): void {
  const backup = new Database(filename, { fileMustExist: true, readonly: true });
  try {
    if (getDatabaseVersion(backup) !== 7 || backup.pragma('quick_check', { simple: true }) !== 'ok') {
      throw new FoundryStorageError(
        'storage-corrupt',
        'The Foundry pre-migration backup is invalid.',
      );
    }
  } finally {
    backup.close();
  }
}

async function prepareSkillMigration(
  database: Database.Database,
  userHomeDirectory: string,
): Promise<PreparedSkillMigration> {
  const legacyPackages = database.prepare<[], LegacySkillPackageRow>(`
    SELECT
      id,
      distribution_name,
      store_observation,
      store_fingerprint,
      created_at,
      updated_at,
      trashed_at,
      removed_at
    FROM skill_packages
    WHERE removed_at IS NULL
    ORDER BY id
  `).all();
  const storeRoot = path.join(userHomeDirectory, '.foundry', 'skills-store');
  const packages: PreparedSkillPackage[] = [];
  const packageFingerprints = new Map<string, { legacy: string; current: string }>();
  for (const skillPackage of legacyPackages) {
    if (
      skillPackage.store_observation !== 'available'
      || !isLegacyFingerprint(skillPackage.store_fingerprint)
    ) {
      throw new FoundryStorageError(
        'storage-corrupt',
        'Legacy Skill Store metadata is incomplete.',
      );
    }
    const packageRoot = skillPackage.trashed_at === null
      ? path.join(storeRoot, 'packages', skillPackage.id)
      : path.join(storeRoot, 'trash', skillPackage.id, 'package');
    const legacyFingerprint = await fingerprintLegacySkillPackageRoot(packageRoot);
    if (legacyFingerprint !== skillPackage.store_fingerprint) {
      throw new FoundryStorageError(
        'storage-corrupt',
        'Legacy Skill Store content changed before migration.',
      );
    }
    const encoded = await encodeSkillPackage(packageRoot);
    const inspected = await inspectSkillPackage(encoded.content, {
      expectedFingerprint: encoded.fingerprint,
    });
    const manifest = readSkillPackageManifest(inspected);
    packageFingerprints.set(skillPackage.id, {
      legacy: legacyFingerprint,
      current: encoded.fingerprint,
    });
    packages.push({
      ...skillPackage,
      content: encoded.content,
      contentFingerprint: encoded.fingerprint,
      description: manifest.description,
    });
  }

  const legacyInstallations = database.prepare<[], LegacySkillInstallationRow>(`
    SELECT
      installation.id,
      installation.package_id,
      installation.target_id,
      installation.distribution_name,
      installation.normalized_distribution_name,
      installation.relative_path,
      installation.relative_path_key,
      installation.created_at,
      installation.updated_at,
      (
        SELECT record.fingerprint
        FROM skill_distribution_records record
        WHERE record.installation_id = installation.id
        ORDER BY record.sequence_number DESC
        LIMIT 1
      ) AS latest_fingerprint
    FROM skill_installations installation
    INNER JOIN skill_packages package ON package.id = installation.package_id
    WHERE installation.uninstalled_at IS NULL AND package.removed_at IS NULL
    ORDER BY installation.id
  `).all();
  const installations = legacyInstallations.map((installation) => {
    const packageFingerprint = packageFingerprints.get(installation.package_id);
    if (!packageFingerprint || !isLegacyFingerprint(installation.latest_fingerprint)) {
      throw new FoundryStorageError(
        'storage-corrupt',
        'Legacy Skill Installation history is incomplete.',
      );
    }
    return {
      ...installation,
      distributedFingerprint: installation.latest_fingerprint === packageFingerprint.legacy
        ? packageFingerprint.current
        : `v1:${installation.latest_fingerprint}`,
    };
  });

  const legacySources = database.prepare<[], LegacySkillSourceRow>(`
    SELECT source.*
    FROM skill_sources source
    INNER JOIN skill_packages package ON package.id = source.package_id
    WHERE package.removed_at IS NULL
    ORDER BY source.id
  `).all();
  const sources = legacySources.map((source) => {
    const packageFingerprint = packageFingerprints.get(source.package_id);
    if (!packageFingerprint || !isLegacyFingerprint(source.observed_content_fingerprint)) {
      throw new FoundryStorageError(
        'storage-corrupt',
        'Legacy Skill Source metadata is invalid.',
      );
    }
    return {
      ...source,
      observedContentFingerprint:
        source.observed_content_fingerprint === packageFingerprint.legacy
          ? packageFingerprint.current
          : `v1:${source.observed_content_fingerprint}`,
    };
  });
  return { packages, installations, sources };
}

function replaceSkillSchema(
  database: Database.Database,
  prepared: PreparedSkillMigration,
): void {
  database.transaction(() => {
    database.exec(currentSkillSchema);
    const insertPackage = database.prepare(`
      INSERT INTO skill_packages_v8 (
        id,
        distribution_name,
        description,
        normalized_distribution_name,
        content_format,
        content_fingerprint,
        content_blob,
        created_at,
        updated_at,
        trashed_at,
        removed_at
      ) VALUES (
        @id,
        @distribution_name,
        @description,
        @normalizedDistributionName,
        '${SKILL_PACKAGE_CONTENT_FORMAT}',
        @contentFingerprint,
        @content,
        @created_at,
        @updated_at,
        @trashed_at,
        NULL
      )
    `);
    for (const skillPackage of prepared.packages) {
      insertPackage.run({
        ...skillPackage,
        normalizedDistributionName: skillPackage.distribution_name.normalize('NFC').toLowerCase(),
      });
    }

    const insertInstallation = database.prepare(`
      INSERT INTO skill_installations_v8 (
        id,
        package_id,
        target_id,
        distribution_name,
        normalized_distribution_name,
        relative_path,
        relative_path_key,
        distributed_fingerprint,
        created_at,
        updated_at,
        uninstalled_at
      ) VALUES (
        @id,
        @package_id,
        @target_id,
        @distribution_name,
        @normalized_distribution_name,
        @relative_path,
        @relative_path_key,
        @distributedFingerprint,
        @created_at,
        @updated_at,
        NULL
      )
    `);
    for (const installation of prepared.installations) {
      insertInstallation.run(installation);
    }

    const insertSource = database.prepare(`
      INSERT INTO skill_sources_v8 (
        id,
        package_id,
        provider,
        tracking_mode,
        source_native_id,
        source_identity_key,
        directory_provider,
        catalog_locator,
        source_url,
        skill_path,
        skill_path_key,
        requested_ref,
        requested_ref_key,
        resolved_revision,
        artifact_digest,
        observed_content_fingerprint,
        canonical_web_url,
        fetched_at,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @package_id,
        @provider,
        @tracking_mode,
        @source_native_id,
        @source_identity_key,
        @directory_provider,
        @catalog_locator,
        @source_url,
        @skill_path,
        @skill_path_key,
        @requested_ref,
        @requested_ref_key,
        @resolved_revision,
        @artifact_digest,
        @observedContentFingerprint,
        @canonical_web_url,
        @fetched_at,
        @created_at,
        @updated_at
      )
    `);
    for (const source of prepared.sources) {
      insertSource.run(source);
    }

    database.exec(`
      DROP TABLE skill_update_candidates;
      DROP TABLE skill_sources;
      DROP TABLE skill_distribution_records;
      DROP TABLE skill_installations;
      DROP TABLE skill_revisions;
      DROP TABLE skill_packages;
      ALTER TABLE skill_packages_v8 RENAME TO skill_packages;
      ALTER TABLE skill_installations_v8 RENAME TO skill_installations;
      ALTER TABLE skill_sources_v8 RENAME TO skill_sources;
      ${currentSkillIndexes}
    `);
    database.pragma(`user_version = ${FOUNDRY_SCHEMA_VERSION}`);
  }).immediate();
}

async function backfillSkillPackageDescriptions(database: Database.Database): Promise<void> {
  const packages = database.prepare<[], {
    id: string;
    content_blob: Buffer;
    content_fingerprint: string;
  }>(`
    SELECT id, content_blob, content_fingerprint
    FROM skill_packages
    WHERE description IS NULL
  `).all();
  const update = database.prepare(`
    UPDATE skill_packages
    SET description = @description
    WHERE id = @id AND description IS NULL
  `);
  for (const skillPackage of packages) {
    try {
      const inspected = await inspectSkillPackage(skillPackage.content_blob, {
        expectedFingerprint: skillPackage.content_fingerprint,
      });
      const description = readSkillPackageManifest(inspected).description;
      if (description !== null) {
        update.run({ id: skillPackage.id, description });
      }
    } catch {
      throw new FoundryStorageError(
        'storage-corrupt',
        'Stored Skill Package content could not be inspected during migration.',
      );
    }
  }
}

async function cleanupLegacySkillStore(userHomeDirectory: string): Promise<void> {
  const storeRoot = path.join(userHomeDirectory, '.foundry', 'skills-store');
  const obsoletePaths = [
    'packages',
    'revisions',
    'trash',
    '.operations',
    '.target-operations',
    '.trash-operations',
  ].map((name) => path.join(storeRoot, name));
  await Promise.allSettled(obsoletePaths.map(async (obsoletePath) => {
    await rm(obsoletePath, { recursive: true, force: true });
  }));
}

async function pathExists(filename: string): Promise<boolean> {
  try {
    await access(filename);
    return true;
  } catch (error) {
    if (hasFilesystemCode(error, 'ENOENT')) {
      return false;
    }
    throw error;
  }
}

function isLegacyFingerprint(value: unknown): value is string {
  return typeof value === 'string' && (/^[0-9a-f]{64}$/).test(value);
}

function hasFilesystemCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
}

function assertDatabaseConsistency(database: Database.Database): void {
  const result = database.pragma('quick_check', { simple: true });
  if (result !== 'ok') {
    throw new FoundryStorageError(
      'storage-corrupt',
      'Foundry storage failed its consistency check.',
    );
  }
}
