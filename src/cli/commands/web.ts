import { defineCommand } from 'citty';
import process from 'node:process';
import { startServer } from '../../server/start';
import { assertPortAvailable } from '../../server/port';
import { initializeFoundryStorage } from '../../storage/database';
import { openInBrowser } from '../open-browser';

const HOSTNAME = '127.0.0.1';
const PORT = 11_111;

export const webCommand = defineCommand({
  meta: {
    name: 'web',
    description: 'Start the Foundry local Web UI',
  },
  args: {
    open: {
      type: 'boolean',
      description: 'Open the Web UI in the default browser',
      negativeDescription: 'Do not open the browser',
      default: true,
    },
  },
  async run({ args }) {
    try {
      await assertPortAvailable(HOSTNAME, PORT);
    } catch (error) {
      reportWebError(error);
      return;
    }

    const database = initializeFoundryStorage();

    startServer({
      database,
      onListening({ url }) {
        console.info(`Foundry is running at ${url}`);

        if (args.open) {
          openInBrowser(url);
        }
      },
    });
  },
});

function reportWebError(error: unknown): void {
  console.error(JSON.stringify({
    error: {
      code: 'WEB_START_FAILED',
      message: error instanceof Error ? error.message : String(error),
    },
  }, null, 2));
  process.exitCode = 1;
}
