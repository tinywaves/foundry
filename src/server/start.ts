import process from 'node:process';
import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import packageJson from '../../package.json' with { type: 'json' };
import { createCaptureRuntime } from '../features/captures/runtime';
import { DataTransferService } from '../features/data-transfer/service';
import type { FoundryDatabase } from '../storage/database';
import { getFoundryDataTransferPath, getFoundrySettingsPath } from '../storage/paths';
import { createApp } from './app';
import { resolveWebRoot } from './web-root';

export interface StartServerOptions {
  database: FoundryDatabase;
  webRoot?: string;
  onListening?: (address: {
    url: string;
    webRoot: string;
  }) => void;
}

export function startServer({
  database,
  webRoot = resolveWebRoot(),
  onListening,
}: StartServerOptions): ServerType {
  const hostname = '127.0.0.1';
  const settingsPath = getFoundrySettingsPath();
  const captureRuntime = createCaptureRuntime(database, settingsPath);
  const dataTransferService = new DataTransferService(
    database,
    settingsPath,
    captureRuntime.runner,
    getFoundryDataTransferPath(),
    packageJson.version,
  );
  dataTransferService.cleanupStaleTransfers();
  const app = createApp(webRoot, database, {
    settingsPath,
    captureService: captureRuntime.service,
    dataTransferService,
    onSettingsChanged: captureRuntime.notifySettingsChanged,
  });
  captureRuntime.start();
  const server = serve(
    {
      fetch: app.fetch,
      hostname,
      port: 11_111,
    },
    () => {
      onListening?.({
        url: 'http://localhost:11111',
        webRoot,
      });
    },
  );

  server.on('error', (error) => {
    console.error(`Unable to start Foundry: ${error.message}`);
    process.exitCode = 1;
  });

  return server;
}
