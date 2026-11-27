import type { CreateInstructionInput, Instruction } from '@dhzh/foundry-shared';

import type { FoundryStorage } from '../../storage/store';
import { createInstruction, listInstructions } from './repository';

export class InstructionsService {
  constructor(private readonly storage: FoundryStorage) {}

  list(): Instruction[] {
    return listInstructions(this.storage);
  }

  create(input: CreateInstructionInput): Instruction {
    return createInstruction(input, this.storage);
  }
}
