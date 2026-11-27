import type { CreateInstructionInput, Instruction } from '@dhzh/foundry-shared';

import { listAgentIdsUsingInstruction } from '../agents/repository';
import type { FoundryStorage } from '../../storage/store';
import {
  InstructionInUseError,
  InstructionNotFoundError,
} from './contracts';
import {
  createInstruction,
  getInstruction,
  listInstructions,
  removeInstructionFile,
  updateInstruction,
} from './repository';

export class InstructionsService {
  constructor(private readonly storage: FoundryStorage) {}

  list(): Instruction[] {
    return listInstructions(this.storage);
  }

  get(id: string): Instruction {
    const instruction = getInstruction(id, this.storage);
    if (!instruction) {
      throw new InstructionNotFoundError(id);
    }
    return instruction;
  }

  create(input: CreateInstructionInput): Instruction {
    return createInstruction(input, this.storage);
  }

  update(id: string, input: CreateInstructionInput): Instruction {
    const instruction = updateInstruction(id, input, this.storage);
    if (!instruction) {
      throw new InstructionNotFoundError(id);
    }
    return instruction;
  }

  delete(id: string): Instruction {
    return this.storage.transaction(() => {
      const instruction = getInstruction(id, this.storage);
      if (!instruction) {
        throw new InstructionNotFoundError(id);
      }
      const agentIds = listAgentIdsUsingInstruction(this.storage, id);
      if (agentIds.length > 0) {
        throw new InstructionInUseError(agentIds);
      }
      if (removeInstructionFile(id, this.storage) === 'missing') {
        throw new InstructionNotFoundError(id);
      }
      return instruction;
    });
  }
}
