import type {
  BaseResult,
  CaptureFilter,
  CaptureSummary,
  CreateCaptureInput,
  CreateCaptureResult,
  ScrapeJobFinishedEvent,
  ScrapeJobSummary,
} from '../../../shared/base';

export const baseKeys = {
  all: ['base'] as const,
  captures: (filter: CaptureFilter) => [...baseKeys.all, 'captures', filter] as const,
  jobs: (captureId: string) => [...baseKeys.all, 'jobs', captureId] as const,
};

export function listCaptures(filter: CaptureFilter = 'all'): Promise<CaptureSummary[]> {
  return globalThis.api.base.listCaptures(filter);
}

export function createCapture(input: CreateCaptureInput): Promise<BaseResult<CreateCaptureResult>> {
  return globalThis.api.base.createCapture(input);
}

export function recapture(captureId: string): Promise<BaseResult<ScrapeJobSummary>> {
  return globalThis.api.base.recapture(captureId);
}

export function deleteCapture(captureId: string): Promise<BaseResult<null>> {
  return globalThis.api.base.deleteCapture(captureId);
}

export function updateCaptureNote(captureId: string, userNote: string): Promise<BaseResult<CaptureSummary>> {
  return globalThis.api.base.updateNote(captureId, userNote);
}

export function listScrapeJobs(captureId: string): Promise<BaseResult<ScrapeJobSummary[]>> {
  return globalThis.api.base.listJobs(captureId);
}

export function subscribeToScrapeJobFinished(
  listener: (event: ScrapeJobFinishedEvent) => void,
): () => void {
  const subscriptionId = globalThis.api.base.onScrapeJobFinished(listener);
  return () => {
    globalThis.api.base.offScrapeJobFinished(subscriptionId);
  };
}
