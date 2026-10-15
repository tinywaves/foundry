import { defineCommand } from 'citty';
import process from 'node:process';
import open from 'open';
import {
  FOUNDRY_SERVER_PORT,
  startFoundryServer,
} from '../server';
import type { FoundryServer, StartFoundryServerOptions } from '../server';
import { formatServerStartError, registerShutdownHandlers } from '../server/lifecycle';

interface UiCommandDependencies {
  error: (message: string) => void;
  log: (message: string) => void;
  openBrowser: (url: string) => Promise<unknown>;
  registerShutdown: (server: FoundryServer) => void;
  setExitCode: (code: number) => void;
  startServer: (options: StartFoundryServerOptions) => Promise<FoundryServer>;
}

const defaultDependencies: UiCommandDependencies = {
  error: console.error,
  log: console.info,
  openBrowser: open,
  registerShutdown: (server) => {
    registerShutdownHandlers(server);
  },
  setExitCode: (code) => {
    process.exitCode = code;
  },
  startServer: startFoundryServer,
};

function getUiArgumentError(rawArgs: string[]): string | undefined {
  for (let index = 0; index < rawArgs.length; index += 1) {
    const argument = rawArgs[index];

    if (argument === '--port') {
      if (index + 1 >= rawArgs.length || rawArgs[index + 1].startsWith('--')) {
        return 'Missing value for option: --port';
      }

      index += 1;
      continue;
    }

    if (argument.startsWith('--port=')) {
      continue;
    }

    if (argument === '--open' || argument === '--no-open') {
      continue;
    }

    return `${argument.startsWith('-') ? 'Unknown option' : 'Unexpected argument'}: ${argument}`;
  }
}

export function parsePort(value: string): number {
  const port = Number(value);

  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError(`Port must be an integer between 1 and 65535. Received "${value}".`);
  }

  return port;
}

export function createUiCommand(dependencies: UiCommandDependencies = defaultDependencies) {
  return defineCommand({
    meta: {
      description: 'Start the Local Web UI',
      name: 'ui',
    },
    args: {
      port: {
        default: String(FOUNDRY_SERVER_PORT),
        description: 'Port for the Local Web UI',
        type: 'string',
        valueHint: 'port',
      },
      open: {
        default: true,
        description: 'Open the Local Web UI in the default browser',
        negativeDescription: 'Do not open the default browser',
        type: 'boolean',
      },
    },
    async run({ args, rawArgs }) {
      const argumentError = getUiArgumentError(rawArgs);
      if (argumentError) {
        dependencies.error(`${argumentError}\nRun \`foundry ui --help\` for usage.`);
        dependencies.setExitCode(1);
        return;
      }

      let port: number;
      try {
        port = parsePort(args.port);
      } catch (error) {
        dependencies.error(
          `${error instanceof Error ? error.message : String(error)}\nRun \`foundry ui --help\` for usage.`,
        );
        dependencies.setExitCode(1);
        return;
      }

      let server: FoundryServer;
      try {
        server = await dependencies.startServer({ port });
      } catch (error) {
        dependencies.error(formatServerStartError(error, port));
        dependencies.setExitCode(1);
        return;
      }

      dependencies.registerShutdown(server);
      dependencies.log(`Foundry Local Web UI: ${server.url}`);

      if (args.open) {
        try {
          await dependencies.openBrowser(server.url);
        } catch {
          dependencies.error(
            `Could not open the default browser. Open ${server.url} manually.`,
          );
        }
      }
    },
  });
}
