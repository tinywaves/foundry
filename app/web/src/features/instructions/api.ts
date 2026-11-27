import type { CreateInstructionInput, Instruction } from '@dhzh/foundry-shared';

const instructionsPath = '/api/instructions';

export function listInstructions(signal?: AbortSignal): Promise<Instruction[]> {
  return requestJson<Instruction[]>({ signal });
}

export function createInstruction(input: CreateInstructionInput): Promise<Instruction> {
  return requestJson<Instruction>({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

async function requestJson<T>(init: RequestInit): Promise<T> {
  const response = await fetch(instructionsPath, init);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json() as {
      error?: { message?: string };
    };
    return payload.error?.message
      ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
