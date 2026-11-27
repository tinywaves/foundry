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

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List instructions, newest first, as JSON',
  },
  run() {
    return runCliAction(({ instructionsService }) => instructionsService.list());
  },
});

const get = defineCommand({
  meta: {
    name: 'get',
    description: 'Read one instruction by ID as JSON',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Instruction ID from the list command',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ instructionsService }) => instructionsService.get(args.id));
  },
});

const edit = defineCommand({
  meta: {
    name: 'edit',
    description: 'Replace an instruction name and Markdown content',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Instruction ID from the list command',
      required: true,
    },
    name: {
      type: 'string',
      description: 'New instruction name',
      valueHint: 'text',
      required: true,
    },
    content: {
      type: 'string',
      description: 'New Markdown content; quote values containing spaces or newlines',
      valueHint: 'markdown',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ instructionsService }) => {
      const instruction = instructionsService.update(
        args.id,
        parseCreateInstructionInput({
          name: args.name,
          content: args.content,
        }),
      );
      return instruction;
    });
  },
});

const remove = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete an unused instruction by ID',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Instruction ID from the list command',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ instructionsService }) => (
      instructionsService.delete(args.id)
    ));
  },
});

export const instructionsCommand = defineCommand({
  meta: {
    name: 'instructions',
    description: 'Create, read, edit, delete, and list Foundry instructions',
  },
  subCommands: {
    new: create,
    list,
    get,
    edit,
    delete: remove,
  },
});
