import { hc, parseResponse } from 'hono/client';
import type { SettingsApi } from '../../../../src/modules/settings/routes';

export type SettingEntry = {
  key: string;
  group: string;
  value: unknown;
  valid: boolean;
  secret: boolean;
  options: readonly string[];
  created_at: number;
  updated_at: number;
};

export type SettingInput = {
  key: string;
  value: unknown;
};

const settingsClient = hc<SettingsApi>(location.origin);

export function fetchSettings(): Promise<SettingEntry[]> {
  return parseResponse(settingsClient.api.settings.$get());
}

export function updateSettings(
  entries: readonly SettingInput[],
): Promise<SettingEntry[]> {
  return parseResponse(
    settingsClient.api.settings.$post({
      json: entries,
    }),
  );
}

export function resetSettings(
  keys: readonly string[],
): Promise<SettingEntry[]> {
  return parseResponse(
    settingsClient.api.settings.reset.$post({
      json: { keys },
    }),
  );
}
