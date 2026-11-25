import { existsSync } from 'node:fs';
import path from 'node:path';
import { ensureFoundryHome, getFoundryHomePath } from './paths';
import { FoundryStorage } from './store';

export { FoundryStorage } from './store';
export { STORAGE_FORMAT_VERSION } from './models';

export function openFoundryStorage(directory = getFoundryHomePath()): FoundryStorage {
  const storage = new FoundryStorage(directory);
  try {
    storage.transaction(() => {
      const settings = storage.readSettings();
      if (!existsSync(path.join(directory, 'settings.json'))) {
        storage.setSettings(settings);
      }
    });
    return storage;
  } catch (error) {
    storage.close();
    throw error;
  }
}

export function initializeFoundryStorage(): FoundryStorage {
  ensureFoundryHome();
  return openFoundryStorage();
}
