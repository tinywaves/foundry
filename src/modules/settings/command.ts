import type { CAC } from 'cac';
import { z } from 'zod';
import { createApplication } from '../../application/create-application';
import type { JsonValue, SettingsService, SettingEntry } from './types';

type SettingsCommandOptions = {
  json?: boolean;
};

const settingsActionSchema = z.enum(['get', 'list', 'set', 'reset']);
type SettingsAction = z.infer<typeof settingsActionSchema>;

function formatValue(value: JsonValue): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function printEntry(entry: SettingEntry, isJson: boolean): void {
  if (isJson) {
    console.info(JSON.stringify(entry));
    return;
  }

  const validity = entry.valid ? '' : ' [invalid]';
  console.info(`${entry.key}: ${formatValue(entry.value)}${validity}`);
}

function printEntries(entries: readonly SettingEntry[], isJson: boolean): void {
  if (isJson) {
    console.info(JSON.stringify(entries));
    return;
  }

  for (const entry of entries) {
    printEntry(entry, false);
  }
}

function runWithSettingsService(
  operation: (settingsService: SettingsService) => void,
): void {
  const application = createApplication();

  try {
    operation(application.settingsService);
  } finally {
    application.close();
  }
}

function assertArgumentCount(
  values: readonly string[],
  expectedCount: number,
  usage: string,
): void {
  if (values.length !== expectedCount) {
    throw new Error(`Usage: foundry settings ${usage}`);
  }
}

function runSettingsAction(
  action: SettingsAction,
  values: readonly string[],
  options: SettingsCommandOptions,
): void {
  const isJson = options.json === true;

  runWithSettingsService((settingsService) => {
    switch (action) {
      case 'get': {
        assertArgumentCount(values, 1, 'get <key>');
        printEntry(settingsService.get(values[0]), isJson);
        return;
      }
      case 'list': {
        assertArgumentCount(values, 0, 'list');
        printEntries(settingsService.list(), isJson);
        return;
      }
      case 'reset': {
        assertArgumentCount(values, 1, 'reset <key>');
        const [entry] = settingsService.resetMany([values[0]]);
        printEntry(entry, isJson);
        return;
      }
      case 'set': {
        assertArgumentCount(values, 2, 'set <key> <value>');
        const [entry] = settingsService.setMany(
          [{ key: values[0], value: values[1] }],
        );
        printEntry(entry, isJson);
      }
    }
  });
}

export function registerSettingsCommands(cli: CAC): void {
  cli
    .command(
      'settings <action> [...values]',
      'Get, list, set, or reset Foundry settings',
    )
    .option('--json', 'Print JSON output')
    .action((
      action: SettingsAction,
      values: string[],
      options: SettingsCommandOptions,
    ) => {
      const parsedAction = settingsActionSchema.safeParse(action);

      if (!parsedAction.success) {
        throw new Error(`Unknown settings action: ${action}`);
      }

      runSettingsAction(parsedAction.data, values, options);
    });
}
