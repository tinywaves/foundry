import type { AgentRecord } from './agents';
import type { Instruction } from './instructions';
import type { FoundrySettings } from './settings';

export const DATA_BACKUP_FORMAT = 'foundry.data';
export const DATA_BACKUP_VERSION = 2;
export const DATA_BACKUP_ENTRY = 'data/foundry.json';

export interface DataExportInput {
  passphrase: string;
}

export interface FoundryData {
  settings: FoundrySettings;
  instructions: Instruction[];
  agents: AgentRecord[];
}

export interface DataBackupManifest {
  format: typeof DATA_BACKUP_FORMAT;
  archiveVersion: typeof DATA_BACKUP_VERSION;
  appVersion: string;
  createdAt: string;
  data: {
    path: typeof DATA_BACKUP_ENTRY;
    bytes: number;
    sha256: string;
  };
}
