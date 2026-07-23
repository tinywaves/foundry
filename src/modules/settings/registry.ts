import { z } from 'zod';
import type { ZodType } from 'zod';
import type { JsonValue } from './types';

type SettingDefinition<T extends JsonValue> = {
  group: string;
  key: string;
  defaultValue: T;
  schema: ZodType<T>;
  secret: boolean;
  options: readonly string[];
};

const settingGroupSeparator = '.';

const themeValues = ['system', 'light', 'dark'] as const;
const themeSchema = z.enum(themeValues);

type Theme = z.infer<typeof themeSchema>;

export const settingsRegistry = [
  {
    group: 'ui',
    key: 'theme',
    defaultValue: 'system',
    schema: themeSchema,
    secret: false,
    options: themeValues,
  },
] as const satisfies ReadonlyArray<SettingDefinition<Theme>>;

type RegisteredSetting = (typeof settingsRegistry)[number];

export function getSettingFullKey(
  setting: Pick<SettingDefinition<JsonValue>, 'group' | 'key'>,
): string {
  return `${setting.group}${settingGroupSeparator}${setting.key}`;
}

export function findSettingDefinition(
  fullKey: string,
): RegisteredSetting | undefined {
  return settingsRegistry.find(
    (setting) => getSettingFullKey(setting) === fullKey,
  );
}
