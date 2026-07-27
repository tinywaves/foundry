import type { CAC } from 'cac';
import { z } from 'zod';
import { createApplication } from '../../application/create-application';
import { output } from '../../cli/output';
import { settingGroupSeparator } from './constants';
import type { JsonValue, SettingInput } from './types';

const settingsActionSchema = z.enum(['get', 'list', 'set', 'reset']);
const settingsTableHeaders = ['Key', 'Value'];
type SettingsActionType = z.infer<typeof settingsActionSchema>;
type SettingsOptionsType = {
  raw?: boolean;
};

function formatValue(value: JsonValue): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function assertArgumentCount(values: readonly string[], expectedCount: number, usage: string): void {
  if (values.length !== expectedCount) {
    throw new Error(`Usage: foundry settings ${usage}`);
  }
}

function parseSettingKey(key: string): Pick<SettingInput, 'group' | 'name'> {
  const separatorIndex = key.indexOf(settingGroupSeparator);

  if (separatorIndex <= 0 || separatorIndex >= key.length - 1) {
    throw new Error(`Invalid setting key: ${key}`);
  }

  return {
    group: key.slice(0, separatorIndex),
    name: key.slice(separatorIndex + 1),
  };
}

export function registerSettingsCommands(cli: CAC): void {
  cli
    .command(
      'settings <action> [...values]',
      'Get, list, set, or reset Foundry settings',
    )
    .option('--raw', 'Print raw output')
    .action((
      action: SettingsActionType,
      values: string[],
      options: SettingsOptionsType,
    ) => {
      const parsedAction = settingsActionSchema.safeParse(action);
      if (!parsedAction.success) {
        throw new Error(`Unknown settings action: ${action}, expected one of: ${settingsActionSchema.options.join(', ')}`);
      }

      const { raw = false } = options;
      const application = createApplication();

      try {
        switch (parsedAction.data) {
          case 'get': {
            assertArgumentCount(values, 1, 'get <key>');
            const { group, name } = parseSettingKey(values[0]);
            const result = application.settingsService.get(group, name);
            raw
              ? output.raw(formatValue(result.value))
              : output.table(
                  settingsTableHeaders,
                  [[result.key, formatValue(result.value)]],
                );
            return;
          }
          case 'list': {
            assertArgumentCount(values, 0, 'list');
            const results = application.settingsService.list();
            if (raw) {
              for (const result of results) {
                output.raw(formatValue(result.value));
              }
            } else {
              output.table(
                settingsTableHeaders,
                results.map((result) => [result.key, formatValue(result.value)]),
              );
            }
            return;
          }
          case 'reset': {
            assertArgumentCount(values, 1, 'reset <key>');
            const { group, name } = parseSettingKey(values[0]);
            try {
              application.settingsService.resetMany([{ group, name }]);
              raw ? output.raw('true') : output.log(true);
            } catch {
              raw ? output.raw('false') : output.log(false);
            }
            return;
          }
          case 'set': {
            assertArgumentCount(values, 2, 'set <key> <value>');
            const { group, name } = parseSettingKey(values[0]);
            try {
              application.settingsService.setMany([{ group, name, value: values[1] }]);
              raw ? output.raw('true') : output.log(true);
            } catch {
              raw ? output.raw('false') : output.log(false);
            }
          }
        }
      } finally {
        application.close();
      }
    });
}
