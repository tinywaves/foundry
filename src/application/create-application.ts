import { ensureStorage } from '../storage/ensure-storage';
import type { StoragePaths } from '../storage/ensure-storage';
import { createSqliteStorage } from '../storage/sqlite-storage';
import type { SqliteStorage } from '../storage/sqlite-storage';
import { createSettingsService } from '../modules/settings/service';
import type { SettingsService } from '../modules/settings/types';

export type ApplicationContext = {
  storage: SqliteStorage;
  storagePaths: StoragePaths;
  settingsService: SettingsService;
  close: () => void;
};

export function createApplication(): ApplicationContext {
  const storagePaths = ensureStorage();
  const storage = createSqliteStorage();

  try {
    storage.assertIntegrity();
    const settingsService = createSettingsService(storage);

    return {
      storage,
      storagePaths,
      settingsService,
      close: storage.close,
    };
  } catch (error) {
    storage.close();
    throw error;
  }
}
