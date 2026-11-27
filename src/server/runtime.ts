import { DataExportService } from '../features/data-export/service';
import { DataImportService } from '../features/data-import/service';
import { AgentsService } from '../features/agents/service';
import { createCaptureRuntime } from '../features/captures/runtime';
import { InstructionsService } from '../features/instructions/service';
import { ProviderService } from '../features/providers/service';
import { SettingsService } from '../features/settings/service';
import { BundledSkillCopyService } from '../features/settings/skill-copy-service';
import { SessionService } from '../features/sessions/service';
import { SETTINGS_CHANGED_EVENT } from '../features/settings/events';
import { watchSettings } from '../features/settings/watch';
import { FoundryEventHub } from '../events/hub';
import type { FoundryStorage } from '../storage/index';
import type { ApiAppOptions } from './api';

export interface FoundryFeatureServices {
  agentsService: AgentsService;
  captureRuntime: ReturnType<typeof createCaptureRuntime>;
  dataExportService: DataExportService;
  dataImportService: DataImportService;
  instructionsService: InstructionsService;
  providerService: ProviderService;
  settingsService: SettingsService;
  settingsSkillCopyService: BundledSkillCopyService;
  sessionService: SessionService;
}

export interface ServerRuntime {
  apiOptions: ApiAppOptions;
  services: FoundryFeatureServices;
  start: () => void;
  stop: () => void;
}

export function createServerRuntime(storage: FoundryStorage): ServerRuntime {
  const eventHub = new FoundryEventHub();
  const captureRuntime = createCaptureRuntime(storage, eventHub);
  const dataExportService = new DataExportService(storage);
  const dataImportService = new DataImportService(storage);
  const instructionsService = new InstructionsService(storage);
  const agentsService = new AgentsService(storage, instructionsService);
  const providerService = new ProviderService(storage);
  const settingsService = new SettingsService(storage);
  const settingsSkillCopyService = new BundledSkillCopyService();
  const sessionService = new SessionService();
  const services: FoundryFeatureServices = {
    agentsService,
    captureRuntime,
    dataExportService,
    dataImportService,
    instructionsService,
    providerService,
    settingsService,
    settingsSkillCopyService,
    sessionService,
  };

  let stopWatching: (() => void) | undefined;
  return {
    services,
    apiOptions: {
      agentsService,
      captureService: captureRuntime.service,
      dataExportService,
      dataImportService,
      instructionsService,
      providerService,
      settingsService,
      settingsSkillCopyService,
      sessionService,
      eventHub,
      onSettingsChanged: captureRuntime.notifySettingsChanged,
    },
    start() {
      stopWatching ??= watchSettings(storage.path, () => {
        captureRuntime.notifySettingsChanged();
        eventHub.publish(SETTINGS_CHANGED_EVENT, { fields: [] });
      });
      captureRuntime.start();
    },
    stop() {
      stopWatching?.();
      stopWatching = undefined;
    },
  };
}
