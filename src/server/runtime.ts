import { DataExportService } from '../features/data-export/service';
import { DataImportService } from '../features/data-import/service';
import { createCaptureRuntime } from '../features/captures/runtime';
import { ProviderService } from '../features/providers/service';
import { SettingsService } from '../features/settings/service';
import { BundledSkillCopyService } from '../features/settings/skill-copy-service';
import { SessionService } from '../features/sessions/service';
import { FoundryEventHub } from '../events/hub';
import type { FoundryStorage } from '../storage/index';
import type { ApiAppOptions } from './api';

export interface FoundryFeatureServices {
  captureRuntime: ReturnType<typeof createCaptureRuntime>;
  dataExportService: DataExportService;
  dataImportService: DataImportService;
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
  const captureRuntime = createCaptureRuntime(storage, eventHub);
  const dataExportService = new DataExportService(storage);
  const dataImportService = new DataImportService(storage);
  const providerService = new ProviderService(storage);
  const settingsService = new SettingsService(storage);
  const settingsSkillCopyService = new BundledSkillCopyService();
  const sessionService = new SessionService();
  const services: FoundryFeatureServices = {
    captureRuntime,
    dataExportService,
    dataImportService,
    providerService,
    settingsService,
    settingsSkillCopyService,
    sessionService,
  };

  return {
    services,
    apiOptions: {
      captureService: captureRuntime.service,
      dataExportService,
      dataImportService,
      providerService,
      settingsService,
      settingsSkillCopyService,
      sessionService,
      eventHub,
      onSettingsChanged: captureRuntime.notifySettingsChanged,
    },
    start() {
      captureRuntime.start();
    },
  };
}
