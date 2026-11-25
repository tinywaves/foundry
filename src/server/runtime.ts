import packageJson from '../../package.json' with { type: 'json' };
import { createCaptureRuntime } from '../features/captures/runtime';
import { DATA_TRANSFER_STATUS_CHANGED_EVENT } from '../features/data-transfer/events';
import { DataTransferService } from '../features/data-transfer/service';
import { WorkspaceMutationGate } from '../features/data-transfer/workspace-mutation';
import { ProviderService } from '../features/providers/service';
import { SettingsService } from '../features/settings/service';
import { BundledSkillCopyService } from '../features/settings/skill-copy-service';
import { SessionService } from '../features/sessions/service';
import { FoundryEventHub } from '../events/hub';
import type { FoundryStorage } from '../storage/index';
import { getFoundryDataTransferPath } from '../storage/paths';
import type { ApiAppOptions } from './api';

export interface FoundryFeatureServices {
  captureRuntime: ReturnType<typeof createCaptureRuntime>;
  dataTransferService: DataTransferService;
  providerService: ProviderService;
  settingsService: SettingsService;
  settingsSkillCopyService: BundledSkillCopyService;
  sessionService: SessionService;
}

export interface ServerRuntime {
  apiOptions: ApiAppOptions;
  services: FoundryFeatureServices;
  start: () => void;
}

export function createServerRuntime(storage: FoundryStorage): ServerRuntime {
  const eventHub = new FoundryEventHub();
  const workspaceMutationGate = new WorkspaceMutationGate();
  const captureRuntime = createCaptureRuntime(storage, eventHub);
  const dataTransferService = new DataTransferService(
    storage,
    captureRuntime.runner,
    getFoundryDataTransferPath(),
    packageJson.version,
    workspaceMutationGate,
    (status) => eventHub.publish(DATA_TRANSFER_STATUS_CHANGED_EVENT, status),
  );
  const providerService = new ProviderService(storage);
  const settingsService = new SettingsService(storage);
  const settingsSkillCopyService = new BundledSkillCopyService();
  const sessionService = new SessionService();
  const services: FoundryFeatureServices = {
    captureRuntime,
    dataTransferService,
    providerService,
    settingsService,
    settingsSkillCopyService,
    sessionService,
  };

  return {
    services,
    apiOptions: {
      captureService: captureRuntime.service,
      dataTransferService,
      providerService,
      settingsService,
      settingsSkillCopyService,
      sessionService,
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
