import type { AgentRecord } from '../../storage/models';
import type { FoundryStorage } from '../../storage/store';

export function listAgentRecords(storage: FoundryStorage): AgentRecord[] {
  return storage.all('agents');
}

export function getAgentRecord(
  storage: FoundryStorage,
  id: string,
): AgentRecord | undefined {
  return storage.get('agents', id);
}

export function saveAgentRecord(
  storage: FoundryStorage,
  record: AgentRecord,
): AgentRecord {
  storage.put('agents', record);
  return record;
}
