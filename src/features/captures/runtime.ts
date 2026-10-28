import type { FoundryDatabase } from '../../storage/database';
import type { FoundryEventHub } from '../../events/hub';
import { CAPTURE_JOB_CHANGED_EVENT } from './events';
import { CaptureRepository } from './repository';
import { ScrapeJobRunner } from './runner';
import { CaptureService } from './service';

export interface CaptureRuntime {
  service: CaptureService;
  runner: ScrapeJobRunner;
  start: () => void;
  notifySettingsChanged: () => void;
}

export function createCaptureRuntime(
  database: FoundryDatabase,
  settingsPath: string,
  eventHub?: FoundryEventHub,
): CaptureRuntime {
  const repository = new CaptureRepository(database.db);
  const runner = new ScrapeJobRunner(
    repository,
    settingsPath,
    (event) => eventHub?.publish(CAPTURE_JOB_CHANGED_EVENT, event),
  );
  const service = new CaptureService(repository, settingsPath, runner);

  return {
    service,
    runner,
    start: () => {
      runner.start();
    },
    notifySettingsChanged: () => {
      runner.notifySettingsChanged();
    },
  };
}
