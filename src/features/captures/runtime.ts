import type { FoundryStorage } from '../../storage/index';
import type { FoundryEventHub } from '../../events/hub';
import { CAPTURE_JOB_CHANGED_EVENT } from './events';
import type { CaptureFetcher } from './fetchers';
import { CaptureRepository } from './repository';
import { FetchJobRunner } from './runner';
import { CaptureService } from './service';

export interface CaptureRuntime {
  service: CaptureService;
  runner: FetchJobRunner;
  start: () => void;
  notifySettingsChanged: () => void;
}

export function createCaptureRuntime(
  storage: FoundryStorage,
  eventHub?: FoundryEventHub,
  fetchCaptureImplementation?: CaptureFetcher,
): CaptureRuntime {
  const repository = new CaptureRepository(storage);
  const runner = new FetchJobRunner(
    repository,
    storage,
    (event) => eventHub?.publish(CAPTURE_JOB_CHANGED_EVENT, event),
    fetchCaptureImplementation,
  );
  const service = new CaptureService(repository, storage, runner);

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
