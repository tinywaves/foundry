import packageJson from '../../package.json' with { type: 'json' };
import { createCaptureRuntime } from '../features/captures/runtime';
import { DATA_TRANSFER_STATUS_CHANGED_EVENT } from '../features/data-transfer/events';
import { DataTransferService } from '../features/data-transfer/service';
import { WorkspaceMutationGate } from '../features/data-transfer/workspace-mutation';
import { ProviderService } from '../features/providers/service';
import { SettingsService } from '../features/settings/service';
import { FoundryEventHub } from '../events/hub';
import type { FoundryDatabase } from '../storage/database';
import { getFoundryDataTransferPath, getFoundrySettingsPath } from '../storage/paths';
import type { ApiAppOptions } from './api';

export interface ServerRuntime {
  apiOptions: ApiAppOptions;
  start: () => void;
}

export function createServerRuntime(database: FoundryDatabase): ServerRuntime {
  const settingsPath = getFoundrySettingsPath();
  const eventHub = new FoundryEventHub();
  const workspaceMutationGate = new WorkspaceMutationGate();
  const captureRuntime = createCaptureRuntime(database, settingsPath, eventHub);
  const dataTransferService = new DataTransferService(
    database,
    settingsPath,
    captureRuntime.runner,
    getFoundryDataTransferPath(),
    packageJson.version,
    workspaceMutationGate,
    (status) => eventHub.publish(DATA_TRANSFER_STATUS_CHANGED_EVENT, status),
  );
  const providerService = new ProviderService(database, settingsPath);
  const settingsService = new SettingsService(settingsPath);

  return {
    apiOptions: {
      settingsPath,
      captureService: captureRuntime.service,
      dataTransferService,
      providerService,
      settingsService,
      workspaceMutationGate,
      eventHub,
      onSettingsChanged: captureRuntime.notifySettingsChanged,
    },
    start() {
      dataTransferService.cleanupStaleTransfers();
      captureRuntime.start();
    },
  };
}
