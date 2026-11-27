import type { StoredJobConfig } from '../features/captures/contracts';
import type { ProviderInput } from '../features/providers/contracts';

export const STORAGE_FORMAT_VERSION = 1;
export interface ProviderRecord extends ProviderInput {
  id: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}
export interface CaptureRecord {
  id: string;
  url: string;
  title: string | null;
  userNote: string | null;
  latestSuccessfulJobId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}
export interface FetchJobRecord {
  id: string;
  captureId: string;
  fetcher: string;
  configSnapshot: StoredJobConfig;
  rawResponse: unknown;
  creditsUsed: number | null;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}
export interface AgentInstructionsRecord {
  instructionIds: string[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}
export interface AgentRecord {
  id: string;
  instructions: AgentInstructionsRecord;
}
export interface Collections {
  agents: AgentRecord;
  providers: ProviderRecord;
  captures: CaptureRecord;
  fetchJobs: FetchJobRecord;
}
