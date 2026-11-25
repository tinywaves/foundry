import type { FoundryStorage } from '../../storage/store';
import { applySettingsPatch, normalizeSettings, toPublicSettings } from './contracts';
import type { FoundrySettings, PublicSettings, SettingsPatch } from './contracts';

export function readStoredSettings(storage: FoundryStorage): FoundrySettings {
  return storage.readSettings();
}

export function readSettings(storage: FoundryStorage): PublicSettings {
  return toPublicSettings(readStoredSettings(storage));
}

export function updateSettings(patch: SettingsPatch, storage: FoundryStorage): PublicSettings {
  return storage.transaction(() => {
    const updated = applySettingsPatch(readStoredSettings(storage), patch);
    storage.setSettings(updated);
    return toPublicSettings(updated);
  });
}

export function writeSettings(value: FoundrySettings, storage: FoundryStorage): void {
  storage.transaction(() => storage.setSettings(normalizeSettings(value)));
}
