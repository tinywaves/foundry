import type { CreateInstructionInput, Instruction } from '@dhzh/foundry-shared';

const instructionsPath = '/api/instructions';

export class InstructionApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InstructionApiError';
  }
}

export function listInstructions(signal?: AbortSignal): Promise<Instruction[]> {
  return requestJson<Instruction[]>(instructionsPath, { signal });
}

export function createInstruction(input: CreateInstructionInput): Promise<Instruction> {
  return requestJson<Instruction>(instructionsPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function getInstruction(
  id: string,
  signal?: AbortSignal,
): Promise<Instruction> {
  return requestJson<Instruction>(instructionPath(id), { signal });
}

export function updateInstruction(
  id: string,
  input: CreateInstructionInput,
): Promise<Instruction> {
  return requestJson<Instruction>(instructionPath(id), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deleteInstruction(id: string): Promise<void> {
  const response = await fetch(instructionPath(id), { method: 'DELETE' });
  if (response.ok) {
    return;
  }
  const error = await readError(response);
  throw new InstructionApiError(error.code, error.message);
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const error = await readError(response);
    throw new InstructionApiError(error.code, error.message);
  }

  return response.json() as Promise<T>;
}

function instructionPath(id: string): string {
  return `${instructionsPath}/${encodeURIComponent(id)}`;
}

async function readError(
  response: Response,
): Promise<{ code: string; message: string }> {
  try {
    const payload = await response.json() as {
      error?: { code?: string; message?: string };
    };
    return {
      code: payload.error?.code ?? 'INSTRUCTION_REQUEST_FAILED',
      message: payload.error?.message
        ?? `Request failed with status ${response.status}`,
    };
  } catch {
    return {
      code: 'INSTRUCTION_REQUEST_FAILED',
      message: `Request failed with status ${response.status}`,
    };
  }
}
