import type { CreateInstructionInput } from '@dhzh/foundry-shared';

export const INSTRUCTION_NAME_MAX_LENGTH = 200;
export const INSTRUCTION_CONTENT_MAX_LENGTH = 1_000_000;
export const INSTRUCTION_ID_PATTERN
  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export class InstructionInputError extends Error {
  readonly code = 'INVALID_INSTRUCTION_INPUT';

  constructor(message: string) {
    super(message);
    this.name = 'InstructionInputError';
  }
}

export class InstructionNotFoundError extends Error {
  readonly code = 'INSTRUCTION_NOT_FOUND';

  constructor(id: string) {
    super(`Instruction not found: ${id}`);
    this.name = 'InstructionNotFoundError';
  }
}

export class InstructionInUseError extends Error {
  readonly code = 'INSTRUCTION_IN_USE';

  constructor(readonly agentIds: string[]) {
    super(`Instruction is assigned to: ${agentIds.join(', ')}`);
    this.name = 'InstructionInUseError';
  }
}

export function parseCreateInstructionInput(value: unknown): CreateInstructionInput {
  if (!isRecord(value)) {
    throw new InstructionInputError('Instruction input must be an object');
  }

  if (typeof value.name !== 'string') {
    throw new InstructionInputError('name is required');
  }
  const name = value.name.trim();
  if (!name) {
    throw new InstructionInputError('name is required');
  }
  if (name.length > INSTRUCTION_NAME_MAX_LENGTH) {
    throw new InstructionInputError(
      `name must be at most ${INSTRUCTION_NAME_MAX_LENGTH} characters`,
    );
  }

  if (typeof value.content !== 'string' || !value.content.trim()) {
    throw new InstructionInputError('content is required');
  }
  if (value.content.length > INSTRUCTION_CONTENT_MAX_LENGTH) {
    throw new InstructionInputError(
      `content must be at most ${INSTRUCTION_CONTENT_MAX_LENGTH} characters`,
    );
  }

  return { name, content: value.content };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
