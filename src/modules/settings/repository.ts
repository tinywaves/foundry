import type { SqliteStorage } from '../../storage/sqlite-storage';
import { settingsRegistry } from './registry';
import type { SettingsRepository } from './types';

const tableName = 'settings';

export function ensureSettingsModule(storage: SqliteStorage) {
  storage.database.exec(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      "group" TEXT NOT NULL,
      name TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY ("group", name)
    )
  `);

  const insertDefault = storage.database.prepare(`
    INSERT OR IGNORE INTO ${tableName} ("group", name, payload, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const now = Date.now();
  storage.transaction(() => {
    for (const setting of settingsRegistry) {
      insertDefault.run(
        setting.group,
        setting.name,
        JSON.stringify({ value: setting.defaultValue }),
        now,
        now,
      );
    }
  });
}

export function createSettingsRepository(storage: SqliteStorage): SettingsRepository {
  const selectSql = (wheres: readonly string[] = []) => `
    SELECT * FROM ${tableName}
    ${wheres.length > 0
        ? `WHERE ${wheres.map((w) => `${w} = ?`).join(' AND ')}`
        : ''
    }
`;
  const select = storage.database.prepare(selectSql());
  const selectByGroupName = storage.database.prepare(selectSql(['"group"', 'name']));

  const upsert = storage.database.prepare(`
    INSERT INTO ${tableName} ("group", name, payload, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT("group", name) DO UPDATE SET
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `);

  return {
    get({ group, name }) {
      return selectByGroupName.get(group, name) as ReturnType<SettingsRepository['get']>;
    },
    getAll() {
      return select.all() as unknown as ReturnType<SettingsRepository['getAll']>;
    },
    upsert(group, name, payload) {
      const now = Date.now();
      const returns = upsert.run(group, name, payload, now, now);
      return returns.changes === 1;
    },
  };
}
