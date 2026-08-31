import { defineCommand, renderUsage, runMain } from 'citty';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import packageJson from '../../package.json' with { type: 'json' };
import { createUiCommand } from './ui-command';

export const foundryCommand = defineCommand({
  meta: {
    description: 'An AI-native local developer runtime',
    name: 'foundry',
    version: packageJson.version,
  },
  subCommands: {
    ui: createUiCommand(),
  },
});

function getRootArgumentError(rawArgs: string[]): string | undefined {
  if (rawArgs.some((argument) => argument === '--help' || argument === '-h')) {
    return;
  }

  if (rawArgs.length === 1 && (rawArgs[0] === '--version' || rawArgs[0] === '-v')) {
    return;
  }

  if (rawArgs[0] === 'ui' || !rawArgs[0]?.startsWith('-')) {
    return;
  }

  return `Unknown option: ${rawArgs[0]}`;
}

export async function runCli(rawArgs: string[] = process.argv.slice(2)): Promise<void> {
  if (rawArgs.length === 0) {
    console.info(`${await renderUsage(foundryCommand)}\n`);
    return;
  }

  const argumentError = getRootArgumentError(rawArgs);
  if (argumentError) {
    console.error(`${argumentError}\nRun \`foundry --help\` for usage.`);
    process.exitCode = 1;
    return;
  }

  await runMain(foundryCommand, { rawArgs });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  void runCli();
}
