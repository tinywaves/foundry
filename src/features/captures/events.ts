import type { FetchJobStatus } from './contracts';

export const CAPTURE_JOB_CHANGED_EVENT = 'capture.job.changed';
export const CAPTURES_CHANGED_EVENT = 'captures.changed';

export interface CaptureJobChangedEvent {
  captureId: string;
  jobId: string;
  status: FetchJobStatus;
  errorMessage?: string;
}

export interface CapturesChangedEvent {
  captureId: string;
  action: 'created' | 'updated' | 'deleted' | 'recaptured';
}
