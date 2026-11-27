export interface LibraryInstructionDragData {
  type: 'library-instruction';
  instructionId: string;
}

export interface AssignedInstructionDragData {
  type: 'assigned-instruction';
  agentId: string;
  instructionId: string;
}

export interface AgentDropData {
  type: 'agent';
  agentId: string;
}

export function libraryInstructionDragId(instructionId: string): string {
  return `library:${instructionId}`;
}

export function assignedInstructionDragId(
  agentId: string,
  instructionId: string,
): string {
  return `assigned:${agentId}:${instructionId}`;
}

export function agentDropId(agentId: string): string {
  return `agent:${agentId}`;
}

export function isAssignedInstructionDragId(
  id: string | number,
): boolean {
  return String(id).startsWith('assigned:');
}

export function isLibraryInstructionDragData(
  value: unknown,
): value is LibraryInstructionDragData {
  return isRecord(value)
    && value.type === 'library-instruction'
    && typeof value.instructionId === 'string';
}

export function isAssignedInstructionDragData(
  value: unknown,
): value is AssignedInstructionDragData {
  return isRecord(value)
    && value.type === 'assigned-instruction'
    && typeof value.agentId === 'string'
    && typeof value.instructionId === 'string';
}

export function isAgentDropData(value: unknown): value is AgentDropData {
  return isRecord(value)
    && value.type === 'agent'
    && typeof value.agentId === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
