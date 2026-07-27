import { hc, parseResponse } from 'hono/client';
import type { SettingsRoutes } from '../../../../src/modules/settings/routes';
import type { JsonValue } from '../../../../src/modules/settings/types';

export type SettingEntry = {
  group: string;
  name: string;
  key: string;
  value: unknown;
};

export type SettingInput = {
  group: string;
  name: string;
  value: JsonValue;
};

export type SettingKey = Pick<SettingInput, 'group' | 'name'>;

const settingsClient = hc<SettingsRoutes>(location.origin);

export function fetchSettings(): Promise<SettingEntry[]> {
  return parseResponse(settingsClient.api.settings.$get());
}

export function updateSettings(
  entries: readonly SettingInput[],
): Promise<boolean> {
  return parseResponse(
    settingsClient.api.settings.$post({
      json: [...entries],
    }),
  );
}

export function resetSettings(
  keys: readonly SettingKey[],
): Promise<boolean> {
  return parseResponse(
    settingsClient.api.settings.reset.$post({
      json: { keys: [...keys] },
    }),
  );
}
