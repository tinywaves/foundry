import { defineCommand, runMain } from 'citty';
import packageJson from '../../package.json' with { type: 'json' };
import { startServer } from '../server/start';
import { initializeFoundryStorage } from '../storage/database';
import { openInBrowser } from './open-browser';

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
  run({ args }) {
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
