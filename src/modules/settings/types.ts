import type { JSONType } from 'zod';

export type JsonValue = JSONType;

export type SettingInput = {
  group: string;
  name: string;
  value: unknown;
};

export type SettingOutput = {
  group: string;
  name: string;
  key: string;
  value: JSONType;
};

export type SettingsService = {
  get: (group: string, name: string) => SettingOutput;
  list: () => SettingOutput[];
  setMany: (entries: readonly SettingInput[]) => void;
  resetMany: (keys: ReadonlyArray<Pick<SettingInput, 'group' | 'name'>>) => void;
};

interface SettingRecord {
  group: string;
  name: string;
  payload: string;
  created_at: number;
  updated_at: number;
}

export type SettingsRepository = {
  get: (options: { group: string; name: string }) => SettingRecord | undefined;
  getAll: () => SettingRecord[];
  upsert: (group: string, name: string, payload: string) => boolean;
};
