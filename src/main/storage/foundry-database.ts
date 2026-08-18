import Database from 'better-sqlite3';
import {
  SKILL_TARGET_MAX_SCAN_DEPTH,
  skillContentObservationStatuses,
  skillDistributionOperations,
  skillRevisionReasons,
  skillSourceCheckStatuses,
  skillSourceProviders,
  skillSourceTrackingModes,
  skillTargetKinds,
  skillTargetPolicySources,
} from '../../shared/skill-contract';
import { FoundryStorageError, toFoundryStorageError } from './storage-error';

export const FOUNDRY_SCHEMA_VERSION = 7;

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
      store_observation IN (${toSqlStringList(skillContentObservationStatuses)})
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
    reason TEXT NOT NULL CHECK (reason IN (${toSqlStringList(skillRevisionReasons)})),
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
      target_observation IN (${toSqlStringList(skillContentObservationStatuses)})
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
      operation IN (${toSqlStringList(skillDistributionOperations)})
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
];

function toSqlStringList(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(', ');
}

export function openFoundryDatabase(filename: string): Database.Database {
  let database: Database.Database | undefined;
  try {
    database = new Database(filename, { timeout: 5000 });
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    database.pragma('busy_timeout = 5000');
    database.pragma('synchronous = NORMAL');
    applyMigrations(database);
    assertDatabaseConsistency(database);
    return database;
  } catch (error) {
    database?.close();
    throw toFoundryStorageError(error);
  }
}

function applyMigrations(database: Database.Database): void {
  const currentVersion = database.pragma('user_version', { simple: true });
  if (typeof currentVersion !== 'number' || !Number.isSafeInteger(currentVersion)) {
    throw new FoundryStorageError('storage-corrupt', 'Foundry database version is invalid.');
  }
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
    database.transaction(() => {
      migration.apply(database);
      database.pragma(`user_version = ${migration.version}`);
    }).immediate();
  }
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
