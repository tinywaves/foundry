import { z } from 'zod';
import type { ZodType } from 'zod';
import { settingGroupSeparator } from './constants';

type SettingDefinition = {
  group: string;
  name: string;
  defaultValue: unknown;
  schema: ZodType;
  secret: boolean;
};

export const settingsRegistry = [
  {
    group: 'ui',
    name: 'theme',
    defaultValue: 'system',
    schema: z.enum(['system', 'light', 'dark']),
    secret: false,
  },
  {
    group: 'ui',
    name: 'pointer',
    defaultValue: true,
    schema: z.boolean(),
    secret: false,
  },
] as const satisfies readonly SettingDefinition[];

export function findSettingDefinition(group: string, name: string) {
  return settingsRegistry.find((setting) => setting.group === group && setting.name === name);
}

export function getSettingKey(group: string, name: string): string {
  return `${group}${settingGroupSeparator}${name}`;
}
