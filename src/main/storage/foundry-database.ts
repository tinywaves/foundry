import Database from 'better-sqlite3';
import { FoundryStorageError, toFoundryStorageError } from './storage-error';

export const FOUNDRY_SCHEMA_VERSION = 3;

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
];

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
