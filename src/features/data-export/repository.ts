import type { FoundryData } from '@dhzh/foundry-shared';

import type { FoundryStorage } from '../../storage/store';
import { SUPPORTED_AGENT_IDS } from '../agents/definitions';
import { listInstructions } from '../instructions/repository';

export function readExportData(storage: FoundryStorage): FoundryData {
  return storage.transaction(() => {
    const supportedAgentIds = new Set<string>(SUPPORTED_AGENT_IDS);
    return {
      settings: storage.readSettings(),
      instructions: listInstructions(storage),
      agents: storage.all('agents')
        .filter(({ id }) => supportedAgentIds.has(id))
        .toSorted((left, right) => left.id.localeCompare(right.id)),
    };
  });
}
