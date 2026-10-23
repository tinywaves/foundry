import type {
  CaptureResult,
  CreateCaptureResult,
} from '../shared/captures';
import type { SettingsSnapshot } from '../shared/settings';
import { formatTimestamp } from './format-time';

export type DatedRecord = {
  createdAt: string;
  updatedAt: string;
};

export function formatRecordTimes<T extends DatedRecord>(
  record: T,
  settings: SettingsSnapshot,
): T {
  return {
    ...record,
    createdAt: formatTimestamp(record.createdAt, settings),
    updatedAt: formatTimestamp(record.updatedAt, settings),
  };
}

export function formatCaptureCreationResult(
  result: CaptureResult<CreateCaptureResult>,
  settings: SettingsSnapshot,
): CaptureResult<CreateCaptureResult> {
  if (!result.ok) {
    return result;
  }
  return {
    ...result,
    data: {
      ...result.data,
      capture: formatRecordTimes(result.data.capture, settings),
    },
  };
}

export function formatRecordResult<T extends DatedRecord>(
  result: CaptureResult<T>,
  settings: SettingsSnapshot,
): CaptureResult<T> {
  return result.ok
    ? { ...result, data: formatRecordTimes(result.data, settings) }
    : result;
}

export function formatRecordListResult<T extends DatedRecord>(
  result: CaptureResult<T[]>,
  settings: SettingsSnapshot,
): CaptureResult<T[]> {
  return result.ok
    ? {
        ...result,
        data: result.data.map((record) => formatRecordTimes(record, settings)),
      }
    : result;
}
