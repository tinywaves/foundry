import type { JSONType } from 'zod';

export type JsonValue = JSONType;

export type SettingInput = {
  key: string;
  value: unknown;
};

export type SettingEntry = {
  key: string;
  group: string;
  value: JsonValue;
  valid: boolean;
  secret: boolean;
  options: readonly string[];
  created_at: number;
  updated_at: number;
};

export type SettingsService = {
  get: (key: string) => SettingEntry;
  list: () => SettingEntry[];
  setMany: (entries: readonly SettingInput[]) => SettingEntry[];
  resetMany: (keys: readonly string[]) => SettingEntry[];
};

export type StoredSetting = {
  key: string;
  payload: string;
  created_at: number;
  updated_at: number;
};

export type SettingsRepository = {
  get: (key: string) => StoredSetting | undefined;
  upsert: (key: string, payload: string, now: number) => void;
};
