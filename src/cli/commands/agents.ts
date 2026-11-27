import { defineCommand } from 'citty';

import { parseUpdateAgentInstructionsInput } from '../../features/agents/contracts';
import { SUPPORTED_AGENT_IDS } from '../../features/agents/definitions';
import { CliInputError, runCliAction } from '../shared';

const agentIds = SUPPORTED_AGENT_IDS.join(', ');

const agentArgument = {
  type: 'positional',
  description: `Agent ID: ${agentIds}`,
  required: true,
} as const;

const listAgents = defineCommand({
  meta: {
    name: 'list',
    description: 'List supported agents and their raw assignment state as JSON',
  },
  run() {
    return runCliAction(({ agentsService }) => agentsService.list());
  },
});

const listAssignments = defineCommand({
  meta: {
    name: 'list',
    description: 'List ordered instruction assignments with instruction names as JSON',
  },
  args: {
    agent: {
      ...agentArgument,
      description: `Optional agent ID: ${agentIds}`,
      required: false,
    },
  },
  run({ args }) {
    return runCliAction(({ agentsService, instructionsService }) => {
      const agents = agentsService.list();
      if (args.agent !== undefined && agents.every(({ id }) => id !== args.agent)) {
        throw new CliInputError(
          'AGENT_NOT_FOUND',
          `Unknown agent: ${args.agent}. Available agents: ${agentIds}`,
        );
      }

      const names = new Map(
        instructionsService.list().map((instruction) => [
          instruction.id,
          instruction.name,
        ]),
      );
      return agents
        .filter(({ id }) => args.agent === undefined || id === args.agent)
        .map((agent) => ({
          id: agent.id,
          name: agent.name,
          instructionFile: agent.instructionFile,
          enabled: agent.enabled,
          instructions: agent.instructionIds.map((instructionId) => ({
            id: instructionId,
            name: names.get(instructionId) ?? null,
          })),
        }));
    });
  },
});

const assign = defineCommand({
  meta: {
    name: 'assign',
    description: 'Replace an agent instruction assignment in composed order',
  },
  args: {
    agent: agentArgument,
    instructions: {
      type: 'string',
      description:
        'Comma-separated instruction IDs in block order; pass an empty string to clear',
      valueHint: 'id1,id2',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ agentsService }) => {
      const input = parseUpdateAgentInstructionsInput({
        instructionIds: args.instructions
          .split(',')
          .map((instructionId) => instructionId.trim())
          .filter(Boolean),
      });
      return agentsService.updateInstructions(args.agent, input.instructionIds);
    });
  },
});

const enable = defineCommand({
  meta: {
    name: 'enable',
    description: 'Write the managed instruction block to the agent file',
  },
  args: { agent: agentArgument },
  run({ args }) {
    return runCliAction(({ agentsService }) => agentsService.setEnabled(args.agent, true));
  },
});

const disable = defineCommand({
  meta: {
    name: 'disable',
    description: 'Remove the managed instruction block from the agent file',
  },
  args: { agent: agentArgument },
  run({ args }) {
    return runCliAction(({ agentsService }) => agentsService.setEnabled(args.agent, false));
  },
});

const reapply = defineCommand({
  meta: {
    name: 'reapply',
    description: 'Rewrite the managed instruction block for an enabled agent',
  },
  args: { agent: agentArgument },
  run({ args }) {
    return runCliAction(({ agentsService }) => agentsService.reapply(args.agent));
  },
});

const open = defineCommand({
  meta: {
    name: 'open',
    description: 'Open the existing agent instruction file',
  },
  args: { agent: agentArgument },
  run({ args }) {
    return runCliAction(({ agentsService }) => agentsService.openInstructionFile(args.agent));
  },
});

export const agentsCommand = defineCommand({
  meta: {
    name: 'agents',
    description: 'Orchestrate Foundry instructions for supported agents',
  },
  subCommands: {
    list: listAgents,
    instructions: defineCommand({
      meta: {
        name: 'instructions',
        description: 'Manage the instruction assignment for an agent',
      },
      subCommands: {
        list: listAssignments,
        assign,
        enable,
        disable,
        reapply,
        open,
      },
    }),
  },
});
