export const FOUNDRY_EVENT_VERSION = 1 as const;

export interface FoundryEvent<TData = unknown> {
  version: typeof FOUNDRY_EVENT_VERSION;
  id: string;
  type: string;
  occurredAt: string;
  data: TData;
}
