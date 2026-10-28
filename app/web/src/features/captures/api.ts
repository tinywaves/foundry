import type {
  CaptureCounts,
  CaptureDetail,
  CaptureErrorCode,
  CaptureFilter,
  CaptureResult,
  CaptureSummary,
  CreateCaptureInput,
  CreateCaptureResult,
  ScrapeJobSummary,
} from './types';
import { errorResult, requestJSON } from '../../lib/api';
import { formatRecordTimes } from '../../lib/format-time';
import { getCachedSettings } from '../settings/api';

export const captureKeys = {
  all: ['captures'] as const,
  list: (filter: CaptureFilter) => [...captureKeys.all, 'list', filter] as const,
  counts: () => [...captureKeys.all, 'counts'] as const,
  detail: (captureId: string) => [...captureKeys.all, 'detail', captureId] as const,
  jobs: (captureId: string) => [...captureKeys.all, 'jobs', captureId] as const,
};

export async function listCaptures(
  filter: CaptureFilter = 'all',
): Promise<CaptureSummary[]> {
  const [captures, settings] = await Promise.all([
    requestJSON<CaptureSummary[]>(`/api/captures?filter=${filter}`),
    getCachedSettings(),
  ]);
  return captures.map((capture) => formatRecordTimes(capture, settings));
}

export function countCaptures(): Promise<CaptureCounts> {
  return requestJSON<CaptureCounts>('/api/captures/counts');
}

export async function getCapture(
  captureId: string,
): Promise<CaptureResult<CaptureDetail>> {
  try {
    const [data, settings] = await Promise.all([
      requestJSON<CaptureDetail>(`/api/captures/${captureId}`),
      getCachedSettings(),
    ]);
    return {
      ok: true,
      data: {
        ...data,
        capture: formatRecordTimes(data.capture, settings),
      },
    };
  } catch (error) {
    return captureFailure<never>(error);
  }
}

export async function createCapture(
  input: CreateCaptureInput,
): Promise<CaptureResult<CreateCaptureResult>> {
  try {
    const [capture, settings] = await Promise.all([
      requestJSON<CaptureSummary>('/api/captures', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
      getCachedSettings(),
    ]);
    return { ok: true, data: { capture: formatRecordTimes(capture, settings) } };
  } catch (error) {
    return captureFailure<never>(error);
  }
}

export async function recapture(
  captureId: string,
): Promise<CaptureResult<ScrapeJobSummary>> {
  try {
    const [data, settings] = await Promise.all([
      requestJSON<ScrapeJobSummary>(
        `/api/captures/${captureId}/recapture`,
        { method: 'POST' },
      ),
      getCachedSettings(),
    ]);
    return { ok: true, data: formatRecordTimes(data, settings) };
  } catch (error) {
    return captureFailure<never>(error);
  }
}

export async function deleteCapture(
  captureId: string,
): Promise<CaptureResult<null>> {
  try {
    await requestJSON<null>(`/api/captures/${captureId}`, { method: 'DELETE' });
    return { ok: true, data: null };
  } catch (error) {
    return captureFailure<never>(error);
  }
}

export async function updateCaptureNote(
  captureId: string,
  userNote: string,
): Promise<CaptureResult<CaptureSummary>> {
  try {
    const [data, settings] = await Promise.all([
      requestJSON<CaptureSummary>(
        `/api/captures/${captureId}/note`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userNote }),
        },
      ),
      getCachedSettings(),
    ]);
    return { ok: true, data: formatRecordTimes(data, settings) };
  } catch (error) {
    return captureFailure<never>(error);
  }
}

export async function listScrapeJobs(
  captureId: string,
): Promise<CaptureResult<ScrapeJobSummary[]>> {
  try {
    const [data, settings] = await Promise.all([
      requestJSON<ScrapeJobSummary[]>(`/api/captures/${captureId}/jobs`),
      getCachedSettings(),
    ]);
    return {
      ok: true,
      data: data.map((job) => formatRecordTimes(job, settings)),
    };
  } catch (error) {
    return captureFailure<never>(error);
  }
}

function captureFailure<T>(error: unknown): CaptureResult<T> {
  const result = errorResult(error);
  return {
    ok: false,
    error: {
      code: result.error.code as CaptureErrorCode,
      message: result.error.message,
    },
  };
}
