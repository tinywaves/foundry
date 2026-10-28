import { serve } from '@hono/node-server';
import packageJson from '../../package.json' with { type: 'json' };
import { createCaptureRuntime } from '../features/captures/runtime';
import { DataTransferService } from '../features/data-transfer/service';
import { initializeFoundryStorage } from '../storage/database';
import { getFoundryDataTransferPath, getFoundrySettingsPath } from '../storage/paths';
import { createApiApp } from './api';

const hostname = '127.0.0.1';
const database = initializeFoundryStorage();
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
const app = createApiApp(database, {
  settingsPath,
  captureService: captureRuntime.service,
  dataTransferService,
  onSettingsChanged: captureRuntime.notifySettingsChanged,
});
captureRuntime.start();

serve(
  {
    fetch: app.fetch,
    hostname,
    port: 22_222,
  },
  () => {
    console.info('Foundry API is running at http://localhost:22222');
  },
);
