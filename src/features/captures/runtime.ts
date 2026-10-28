import type { FoundryDatabase } from '../../storage/database';
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
): CaptureRuntime {
  const repository = new CaptureRepository(database.db);
  const runner = new ScrapeJobRunner(repository, settingsPath);
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
