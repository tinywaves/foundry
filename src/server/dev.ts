import {
  FOUNDRY_SERVER_PORT,
  startFoundryServer,
} from '.';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { formatServerStartError, registerShutdownHandlers } from './lifecycle';

export async function runServerDevelopment(): Promise<void> {
  try {
    const server = await startFoundryServer();
    console.info(`Foundry Server: ${server.url}`);
    registerShutdownHandlers(server);
  } catch (error) {
    console.error(formatServerStartError(error, FOUNDRY_SERVER_PORT));
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  void runServerDevelopment();
}
