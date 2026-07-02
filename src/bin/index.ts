import cac from 'cac';
import { consola } from 'consola';
import { startWebUiServer } from './server';

const cli = cac('foundry');

cli
  .command('[...args]', 'Open a local Foundry workspace')
  .action(() => {
    const webUi = startWebUiServer();
    consola.box(`Foundry workspace is running at ${webUi.url}`);
  });

cli.help();
cli.parse();
