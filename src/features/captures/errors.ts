export type CaptureErrorCode
  = | 'ACTIVE_JOB_EXISTS'
    | 'CAPTURE_ALREADY_EXISTS'
    | 'CAPTURE_NOT_FOUND'
    | 'FETCHER_NOT_CONFIGURED'
    | 'INVALID_URL';

export class CaptureError extends Error {
  constructor(
    readonly code: CaptureErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CaptureError';
  }
}
