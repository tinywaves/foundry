import type { SqliteStorage } from '../../storage/sqlite-storage';
import { getSettingFullKey, settingsRegistry } from './registry';
import type { SettingsRepository, StoredSetting } from './types';

const settingsTableName = 'settings';

export function ensureSettingsModule(storage: SqliteStorage): void {
  storage.database.exec(`
    CREATE TABLE IF NOT EXISTS ${settingsTableName} (
      key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  const insertDefault = storage.database.prepare(`
    INSERT OR IGNORE INTO ${settingsTableName}
      (key, payload, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  const now = Date.now();

  storage.transaction(() => {
    for (const setting of settingsRegistry) {
      insertDefault.run(
        getSettingFullKey(setting),
        JSON.stringify({ value: setting.defaultValue }),
        now,
        now,
      );
    }
  });
}

export function createSettingsRepository(storage: SqliteStorage): SettingsRepository {
  const selectByKey = storage.database.prepare(`
    SELECT key, payload, created_at, updated_at
    FROM ${settingsTableName}
    WHERE key = ?
  `);
  const upsert = storage.database.prepare(`
    INSERT INTO ${settingsTableName}
      (key, payload, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `);

  return {
    get: (key) => {
      const row = selectByKey.get(key) as StoredSetting | undefined;
      return row;
    },
    upsert: (key, payload, now) => {
      upsert.run(key, payload, now, now);
    },
  };
}
