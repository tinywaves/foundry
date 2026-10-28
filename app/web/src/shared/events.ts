export const FOUNDRY_EVENT_VERSION = 1 as const;

export const CAPTURE_JOB_CHANGED_EVENT = 'capture.job.changed';
export const CAPTURES_CHANGED_EVENT = 'captures.changed';
export const DATA_TRANSFER_STATUS_CHANGED_EVENT = 'data-transfer.status.changed';
export const DATA_TRANSFER_IMPORTED_EVENT = 'data-transfer.imported';
export const PROVIDERS_CHANGED_EVENT = 'providers.changed';
export const SETTINGS_CHANGED_EVENT = 'settings.changed';

export interface FoundryEvent<TData = unknown> {
  version: typeof FOUNDRY_EVENT_VERSION;
  id: string;
  type: string;
  occurredAt: string;
  data: TData;
}

export function parseFoundryEvent(value: string): FoundryEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  // A guard keeps the protocol fields visibly checked before constructing the event.
  if (!isRecord(parsed)
    || parsed.version !== FOUNDRY_EVENT_VERSION
    || typeof parsed.id !== 'string'
    || typeof parsed.type !== 'string'
    || typeof parsed.occurredAt !== 'string'
    || !('data' in parsed)) {
    return null;
  }

  return {
    version: FOUNDRY_EVENT_VERSION,
    id: parsed.id,
    type: parsed.type,
    occurredAt: parsed.occurredAt,
    data: parsed.data,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
