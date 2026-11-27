export const INSTRUCTION_DRAG_TYPE = 'application/x-foundry-instruction';
export const ASSIGNED_INSTRUCTION_DRAG_TYPE = 'application/x-foundry-assigned';

export interface AssignedInstructionDrag {
  agentId: string;
  instructionId: string;
}

export function hasDragType(
  dataTransfer: DataTransfer,
  type: string,
): boolean {
  return [...dataTransfer.types].includes(type);
}

export function readAssignedInstructionDrag(
  dataTransfer: DataTransfer,
): AssignedInstructionDrag | null {
  const value = dataTransfer.getData(ASSIGNED_INSTRUCTION_DRAG_TYPE);
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as Partial<AssignedInstructionDrag>;
    return typeof parsed.agentId === 'string'
      && typeof parsed.instructionId === 'string'
      ? {
          agentId: parsed.agentId,
          instructionId: parsed.instructionId,
        }
      : null;
  } catch {
    return null;
  }
}
