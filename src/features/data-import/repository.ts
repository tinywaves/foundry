import path from 'node:path';
import type { FoundryData } from '@dhzh/foundry-shared';

import type { FoundryStorage } from '../../storage/store';
import {
  listInstructions,
  serializeInstruction,
} from '../instructions/repository';

export function replaceImportedData(storage: FoundryStorage, data: FoundryData): void {
  storage.transaction(() => {
    const importedInstructionIds = new Set(
      data.instructions.map(({ id }) => id),
    );
    for (const instruction of listInstructions(storage)) {
      if (!importedInstructionIds.has(instruction.id)) {
        storage.removeTextFile(instructionPath(instruction.id));
      }
    }
    for (const instruction of data.instructions) {
      storage.putTextFile(
        instructionPath(instruction.id),
        serializeInstruction(instruction),
      );
    }

    const importedAgentIds = new Set(data.agents.map(({ id }) => id));
    for (const agent of storage.all('agents')) {
      if (!importedAgentIds.has(agent.id)) {
        storage.remove('agents', agent.id);
      }
    }
    for (const agent of data.agents) {
      storage.put('agents', agent);
    }

    storage.setSettings(data.settings);
  });
}

function instructionPath(id: string): string {
  return path.join('instructions', `${id}.md`);
}
