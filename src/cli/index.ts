import { defineCommand, runMain } from 'citty';
import process from 'node:process';
import packageJson from '../../package.json' with { type: 'json' };
import { startServer } from '../server/start';
import { assertPortAvailable } from '../server/port';
import { initializeFoundryStorage } from '../storage/database';
import { openInBrowser } from './open-browser';

const HOSTNAME = '127.0.0.1';
const PORT = 11_111;

const main = defineCommand({
  meta: {
    name: 'foundry',
    version: packageJson.version,
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
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Unable to start Foundry: ${message}`);
      process.exitCode = 1;
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

void runMain(main);
