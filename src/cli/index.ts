import cac from 'cac';
import process from 'node:process';
import terminalLink from 'terminal-link';
import { registerSettingsCommands } from '../modules/settings/command';
import { output } from './output';
import { startWebUiServer } from './server';

const cli = cac('foundry');

registerSettingsCommands(cli);

cli
  .command('[...args]', 'Open a local Foundry workspace')
  .action(() => {
    const webUi = startWebUiServer();
    const linkedUrl = terminalLink(
      webUi.url,
      webUi.url,
      { fallback: false },
    );
    output.info(`Foundry workspace is running at ${linkedUrl}`);
  });

cli.help();

try {
  cli.parse();
} catch (error) {
  output.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
