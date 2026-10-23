import type { FetcherType } from './settings';

export type CaptureFilter = 'all' | 'no-successful';

export type CaptureSummary = {
  id: string;
  url: string;
  title: string | null;
  userNote: string | null;
  latestSuccessfulJobId: string | null;
  /**
  Formatted with the current Time format and Time zone before crossing IPC.
  */
  createdAt: string;
  /**
  Formatted with the current Time format and Time zone before crossing IPC.
  */
  updatedAt: string;
};

export type CreateCaptureInput = {
  url: string;
  userNote?: string;
};

export type CreateCaptureResult = {
  capture: CaptureSummary;
  created: boolean;
};

export type ScrapeJobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export type ScrapeJobSummary = {
  id: string;
  captureId: string;
  status: ScrapeJobStatus;
  fetcher: FetcherType;
  errorCode: string | null;
  errorMessage: string | null;
  /**
  Formatted with the current Time format and Time zone before crossing IPC.
  */
  createdAt: string;
  /**
  Formatted with the current Time format and Time zone before crossing IPC.
  */
  updatedAt: string;
};

export type ScrapeJobFinishedEvent = {
  captureId: string;
  jobId: string;
  status: 'succeeded' | 'failed';
  errorMessage?: string;
};

export type BaseErrorCode
  = | 'ACTIVE_JOB_EXISTS'
    | 'BASE_NOT_CONFIGURED'
    | 'CAPTURE_NOT_FOUND'
    | 'INVALID_URL';

export type BaseResult<T>
  = | { ok: true; data: T }
    | { ok: false; error: { code: BaseErrorCode; message: string } };
