import cac from 'cac';
import terminalLink from 'terminal-link';
import { startWebUiServer } from './server';

const cli = cac('foundry');

cli
  .command('[...args]', 'Open a local Foundry workspace')
  .action(() => {
    const webUi = startWebUiServer();
    const linkedUrl = terminalLink(
      webUi.url,
      webUi.url,
      { fallback: false },
    );
    console.info(`Foundry workspace is running at ${linkedUrl}`);
  });

cli.help();
cli.parse();
