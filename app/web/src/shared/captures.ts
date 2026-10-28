import type { FetcherType } from './settings';

export type CaptureFilter = 'all' | 'no-successful';

export type CaptureCounts = {
  all: number;
  noSuccessful: number;
};

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

export type CaptureContent = {
  jobId: string;
  markdown: string;
};

export type CaptureDetail = {
  capture: CaptureSummary;
  content: CaptureContent | null;
};

export type CreateCaptureInput = {
  url: string;
  userNote?: string;
};

export type CreateCaptureResult = {
  capture: CaptureSummary;
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

export type CaptureErrorCode
  = | 'ACTIVE_JOB_EXISTS'
    | 'DATA_TRANSFER_BUSY'
    | 'FETCHER_NOT_CONFIGURED'
    | 'CAPTURE_ALREADY_EXISTS'
    | 'CAPTURE_NOT_FOUND'
    | 'INVALID_URL';

export type CaptureResult<T>
  = | { ok: true; data: T }
    | { ok: false; error: { code: CaptureErrorCode; message: string } };
