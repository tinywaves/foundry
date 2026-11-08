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

export type CaptureDetail = {
  capture: CaptureSummary;
  rawResponse: unknown;
};

export type CreateCaptureInput = {
  url: string;
  userNote?: string;
};

export type CreateCaptureResult = {
  capture: CaptureSummary;
};

export type FetchJobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export type FetchJobSummary = {
  id: string;
  captureId: string;
  status: FetchJobStatus;
  fetcher: FetcherType;
  creditsUsed: number | null;
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
