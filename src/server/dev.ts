import { serve } from '@hono/node-server';
import packageJson from '../../package.json' with { type: 'json' };
import { createCaptureRuntime } from '../features/captures/runtime';
import { DATA_TRANSFER_STATUS_CHANGED_EVENT } from '../features/data-transfer/events';
import { DataTransferService } from '../features/data-transfer/service';
import { FoundryEventHub } from '../events/hub';
import { initializeFoundryStorage } from '../storage/database';
import { getFoundryDataTransferPath, getFoundrySettingsPath } from '../storage/paths';
import { createApiApp } from './api';

const hostname = '127.0.0.1';
const database = initializeFoundryStorage();
const settingsPath = getFoundrySettingsPath();
const eventHub = new FoundryEventHub();
const captureRuntime = createCaptureRuntime(database, settingsPath, eventHub);
const dataTransferService = new DataTransferService(
  database,
  settingsPath,
  captureRuntime.runner,
  getFoundryDataTransferPath(),
  packageJson.version,
  (status) => eventHub.publish(DATA_TRANSFER_STATUS_CHANGED_EVENT, status),
);
dataTransferService.cleanupStaleTransfers();
const app = createApiApp(database, {
  settingsPath,
  captureService: captureRuntime.service,
  dataTransferService,
  eventHub,
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
