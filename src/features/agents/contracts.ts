import type {
  UpdateAgentEnabledInput,
  UpdateAgentInstructionsInput,
} from '@dhzh/foundry-shared';

export class AgentError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export function parseUpdateAgentInstructionsInput(
  value: unknown,
): UpdateAgentInstructionsInput {
  if (!isRecord(value) || !Array.isArray(value.instructionIds)) {
    throw new AgentError(
      'INVALID_AGENT_INPUT',
      'instructionIds must be an array',
      400,
    );
  }

  const instructionIds = value.instructionIds.map((instructionId) => {
    if (typeof instructionId !== 'string' || !instructionId.trim()) {
      throw new AgentError(
        'INVALID_AGENT_INPUT',
        'instructionIds must contain non-empty strings',
        400,
      );
    }
    return instructionId;
  });

  if (new Set(instructionIds).size !== instructionIds.length) {
    throw new AgentError(
      'DUPLICATE_INSTRUCTION',
      'An instruction cannot be added to the same agent twice',
      400,
    );
  }

  return { instructionIds };
}

export function parseUpdateAgentEnabledInput(
  value: unknown,
): UpdateAgentEnabledInput {
  if (!isRecord(value) || typeof value.enabled !== 'boolean') {
    throw new AgentError(
      'INVALID_AGENT_INPUT',
      'enabled must be a boolean',
      400,
    );
  }

  return { enabled: value.enabled };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
