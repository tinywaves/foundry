import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getFoundrySettingsPath } from '../../storage/paths';
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  normalizeSettings,
  toPublicSettings,
} from './contracts';
import type {
  FoundrySettings,
  PublicSettings,
  SettingsPatch,
} from './contracts';

export function readStoredSettings(
  settingsPath = getFoundrySettingsPath(),
): FoundrySettings {
  try {
    const parsed: unknown = JSON.parse(readFileSync(settingsPath, 'utf8'));
    return normalizeSettings(parsed);
  } catch {
    return normalizeSettings(DEFAULT_SETTINGS);
  }
}

export function readSettings(settingsPath = getFoundrySettingsPath()): PublicSettings {
  return toPublicSettings(readStoredSettings(settingsPath));
}

export function updateSettings(
  patch: SettingsPatch,
  settingsPath = getFoundrySettingsPath(),
): PublicSettings {
  const updated = applySettingsPatch(readStoredSettings(settingsPath), patch);
  writeSettings(updated, settingsPath);
  return toPublicSettings(updated);
}

export function writeSettings(
  settings: FoundrySettings,
  settingsPath = getFoundrySettingsPath(),
): void {
  mkdirSync(path.dirname(settingsPath), { recursive: true });
  const temporaryPath = `${settingsPath}.tmp`;

  writeFileSync(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, {
    mode: 0o600,
  });
  renameSync(temporaryPath, settingsPath);
}
