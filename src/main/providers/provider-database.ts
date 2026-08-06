import Database from 'better-sqlite3';
import { ProviderOperationError, toProviderOperationError } from './provider-error';

export const PROVIDER_SCHEMA_VERSION = 1;

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

interface Migration {
  version: number;
  apply: (database: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    apply: (database) => database.exec(initialProviderSchema),
  },
];

export function openProviderDatabase(filename: string): Database.Database {
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
    throw toProviderOperationError(error);
  }
}

function applyMigrations(database: Database.Database): void {
  const currentVersion = database.pragma('user_version', { simple: true });
  if (typeof currentVersion !== 'number' || !Number.isSafeInteger(currentVersion)) {
    throw new ProviderOperationError('storage-corrupt', 'Provider database version is invalid.');
  }
  if (currentVersion > PROVIDER_SCHEMA_VERSION) {
    throw new ProviderOperationError(
      'unsupported-database-version',
      'Provider storage was created by a newer Foundry version.',
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
    throw new ProviderOperationError('storage-corrupt', 'Provider storage failed its consistency check.');
  }
}
