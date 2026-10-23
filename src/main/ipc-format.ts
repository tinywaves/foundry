import type {
  BaseResult,
  CreateCaptureResult,
} from '../shared/base';
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
  result: BaseResult<CreateCaptureResult>,
  settings: SettingsSnapshot,
): BaseResult<CreateCaptureResult> {
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
  result: BaseResult<T>,
  settings: SettingsSnapshot,
): BaseResult<T> {
  return result.ok
    ? { ...result, data: formatRecordTimes(result.data, settings) }
    : result;
}

export function formatRecordListResult<T extends DatedRecord>(
  result: BaseResult<T[]>,
  settings: SettingsSnapshot,
): BaseResult<T[]> {
  return result.ok
    ? {
        ...result,
        data: result.data.map((record) => formatRecordTimes(record, settings)),
      }
    : result;
}
