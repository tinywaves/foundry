import {
  defineCommand,
  showUsage,
} from 'citty';
import type { CommandDef } from 'citty';
import packageJson from '../../package.json' with { type: 'json' };
import { capturesCommand } from './commands/captures';
import { dataTransferCommand } from './commands/data-transfer';
import { providersCommand } from './commands/providers';
import { settingsCommand } from './commands/settings';
import { webCommand } from './commands/web';

export function createFoundryCommand(): CommandDef {
  let command!: CommandDef;

  const help = defineCommand({
    meta: {
      name: 'help',
      description: 'Show Foundry CLI help',
      hidden: true,
    },
    async run() {
      await showUsage(command);
    },
  });

  command = defineCommand({
    meta: {
      name: 'foundry',
      version: packageJson.version,
      description: 'Manage local Foundry data or start the Web UI',
    },
    default: 'help',
    subCommands: {
      'help': help,
      'web': webCommand,
      'settings': settingsCommand,
      'providers': providersCommand,
      'captures': capturesCommand,
      'data-transfer': dataTransferCommand,
    },
  });

  return command;
}
