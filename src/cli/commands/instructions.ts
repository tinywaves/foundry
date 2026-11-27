import { defineCommand } from 'citty';

import { parseCreateInstructionInput } from '../../features/instructions/contracts';
import { runCliAction } from '../shared';

const create = defineCommand({
  meta: {
    name: 'new',
    description: 'Create an instruction from a name and Markdown content',
  },
  args: {
    name: {
      type: 'string',
      description: 'Instruction name',
      valueHint: 'text',
      required: true,
    },
    content: {
      type: 'string',
      description: 'Markdown content; quote values containing spaces or newlines',
      valueHint: 'markdown',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ instructionsService }) => {
      const instruction = instructionsService.create(
        parseCreateInstructionInput({
          name: args.name,
          content: args.content,
        }),
      );
      return instruction;
    });
  },
});

export const instructionsCommand = defineCommand({
  meta: {
    name: 'instructions',
    description: 'Create Foundry instructions',
  },
  subCommands: {
    new: create,
  },
});
