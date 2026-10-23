import type {
  CaptureDetail,
  CaptureFilter,
  CaptureResult,
  CaptureSummary,
  CreateCaptureInput,
  CreateCaptureResult,
  ScrapeJobFinishedEvent,
  ScrapeJobSummary,
} from '../../../shared/captures';

export const captureKeys = {
  all: ['captures'] as const,
  list: (filter: CaptureFilter) => [...captureKeys.all, 'list', filter] as const,
  detail: (captureId: string) => [...captureKeys.all, 'detail', captureId] as const,
  jobs: (captureId: string) => [...captureKeys.all, 'jobs', captureId] as const,
};

export function listCaptures(filter: CaptureFilter = 'all'): Promise<CaptureSummary[]> {
  return globalThis.api.captures.listCaptures(filter);
}

export function getCapture(captureId: string): Promise<CaptureResult<CaptureDetail>> {
  return globalThis.api.captures.getCapture(captureId);
}

export function createCapture(input: CreateCaptureInput): Promise<CaptureResult<CreateCaptureResult>> {
  return globalThis.api.captures.createCapture(input);
}

export function recapture(captureId: string): Promise<CaptureResult<ScrapeJobSummary>> {
  return globalThis.api.captures.recapture(captureId);
}

export function deleteCapture(captureId: string): Promise<CaptureResult<null>> {
  return globalThis.api.captures.deleteCapture(captureId);
}

export function updateCaptureNote(captureId: string, userNote: string): Promise<CaptureResult<CaptureSummary>> {
  return globalThis.api.captures.updateNote(captureId, userNote);
}

export function listScrapeJobs(captureId: string): Promise<CaptureResult<ScrapeJobSummary[]>> {
  return globalThis.api.captures.listJobs(captureId);
}

export function subscribeToScrapeJobFinished(
  listener: (event: ScrapeJobFinishedEvent) => void,
): () => void {
  const subscriptionId = globalThis.api.captures.onScrapeJobFinished(listener);
  return () => {
    globalThis.api.captures.offScrapeJobFinished(subscriptionId);
  };
}
