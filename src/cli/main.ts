import {
  defineCommand,
  showUsage,
} from 'citty';
import type { CommandDef } from 'citty';
import packageJson from '../../package.json' with { type: 'json' };
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
      description: 'Manage Foundry settings or start the Web UI',
    },
    default: 'help',
    subCommands: {
      help,
      web: webCommand,
      settings: settingsCommand,
    },
  });

  return command;
}
