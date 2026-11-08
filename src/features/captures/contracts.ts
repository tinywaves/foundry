import type { FetcherType } from '../settings/contracts';

export type CaptureFilter = 'all' | 'no-successful';
export type FetchJobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface CaptureSummary {
  id: string;
  url: string;
  title: string | null;
  userNote: string | null;
  latestSuccessfulJobId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaptureDetail {
  capture: CaptureSummary;
  rawResponse: unknown;
}

export interface CaptureCounts {
  all: number;
  noSuccessful: number;
}

export interface CreateCaptureInput {
  url: string;
  userNote?: string;
}

export interface FetchJobSummary {
  id: string;
  captureId: string;
  status: FetchJobStatus;
  fetcher: FetcherType;
  creditsUsed: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredJobConfig {
  fetcher: FetcherType;
  apiKey: string;
  maxAttempts: number;
}

export function parseCreateCaptureInput(value: unknown): CreateCaptureInput {
  if (!isRecord(value) || typeof value.url !== 'string') {
    throw new CaptureInputError('A URL is required');
  }

  return {
    url: value.url,
    userNote: typeof value.userNote === 'string' ? value.userNote : undefined,
  };
}

export function parseCaptureFilter(value: string | undefined): CaptureFilter {
  return value === 'no-successful' ? 'no-successful' : 'all';
}

export function parseUserNote(value: unknown): string {
  if (!isRecord(value) || typeof value.userNote !== 'string') {
    throw new CaptureInputError('userNote must be a string');
  }

  return value.userNote;
}

export class CaptureInputError extends Error {
  readonly code = 'INVALID_CAPTURE_INPUT';

  constructor(message: string) {
    super(message);
    this.name = 'CaptureInputError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
