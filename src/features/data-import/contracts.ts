import { DATA_BACKUP_ENTRY, DATA_BACKUP_FORMAT, DATA_BACKUP_VERSION } from '@dhzh/foundry-shared';
import type {
  AgentRecord,
  DataBackupManifest,
  DataImportErrorCode,
  FoundryData,
  Instruction,
} from '@dhzh/foundry-shared';

import { SUPPORTED_AGENT_IDS } from '../agents/definitions';
import {
  INSTRUCTION_CONTENT_MAX_LENGTH,
  INSTRUCTION_ID_PATTERN,
  INSTRUCTION_NAME_MAX_LENGTH,
} from '../instructions/contracts';
import { normalizeSettings } from '../settings/contracts';

export class DataImportError extends Error {
  constructor(readonly code: DataImportErrorCode, message: string) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseDataBackupManifest(value: unknown): Pick<DataBackupManifest, 'data'> {
  if (
    !isRecord(value) || value.format !== DATA_BACKUP_FORMAT
    || value.archiveVersion !== DATA_BACKUP_VERSION
    || !isRecord(value.data) || value.data.path !== DATA_BACKUP_ENTRY
    || typeof value.data.bytes !== 'number' || !Number.isSafeInteger(value.data.bytes)
    || value.data.bytes <= 0
    || typeof value.data.sha256 !== 'string' || !(/^[a-f0-9]{64}$/u).test(value.data.sha256)
  ) {
    throw new DataImportError('INVALID_BACKUP', 'Unsupported or invalid backup manifest');
  }
  return {
    data: { path: DATA_BACKUP_ENTRY, bytes: value.data.bytes, sha256: value.data.sha256 },
  };
}

export function parseImportData(value: unknown): FoundryData {
  if (
    !isRecord(value)
    || !isRecord(value.settings)
    || !Array.isArray(value.instructions)
    || !Array.isArray(value.agents)
  ) {
    throw invalidBackup(
      'Backup data must contain settings, instructions, and agents',
    );
  }
  const instructions = parseInstructions(value.instructions);
  const instructionIds = new Set(instructions.map(({ id }) => id));
  return {
    settings: normalizeSettings(value.settings),
    instructions,
    agents: parseAgents(value.agents, instructionIds),
  };
}

function parseInstructions(value: unknown[]): Instruction[] {
  const ids = new Set<string>();
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw invalidBackup(`Invalid instruction at index ${index}`);
    }
    const id = entry.id;
    if (
      typeof id !== 'string'
      || !INSTRUCTION_ID_PATTERN.test(id)
      || ids.has(id)
    ) {
      throw invalidBackup(`Invalid instruction at index ${index}`);
    }
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!name || name.length > INSTRUCTION_NAME_MAX_LENGTH) {
      throw invalidBackup(`Invalid instruction name at index ${index}`);
    }
    if (
      typeof entry.content !== 'string'
      || !entry.content.trim()
      || entry.content.length > INSTRUCTION_CONTENT_MAX_LENGTH
    ) {
      throw invalidBackup(`Invalid instruction content at index ${index}`);
    }
    const instruction: Instruction = {
      id,
      name,
      content: entry.content,
      createdAt: readTimestamp(entry.createdAt, index),
      updatedAt: readTimestamp(entry.updatedAt, index),
    };
    ids.add(id);
    return instruction;
  });
}

function parseAgents(
  value: unknown[],
  instructionIds: Set<string>,
): AgentRecord[] {
  const supportedAgentIds = new Set<string>(SUPPORTED_AGENT_IDS);
  const ids = new Set<string>();
  return value.map((entry, index) => {
    if (!isRecord(entry) || !isRecord(entry.instructions)) {
      throw invalidBackup(`Invalid agent at index ${index}`);
    }
    const id = entry.id;
    if (
      typeof id !== 'string'
      || !supportedAgentIds.has(id)
      || ids.has(id)
    ) {
      throw invalidBackup(`Invalid agent at index ${index}`);
    }
    const state = entry.instructions;
    const assigned = state.instructionIds;
    if (!Array.isArray(assigned)) {
      throw invalidBackup(`Invalid instruction assignment for agent ${id}`);
    }
    const assignedIds = assigned.map((instructionId) => {
      if (typeof instructionId !== 'string') {
        throw invalidBackup(`Invalid instruction assignment for agent ${id}`);
      }
      return instructionId;
    });
    if (
      new Set(assignedIds).size !== assignedIds.length
        || assignedIds.some((instructionId) => !instructionIds.has(instructionId))
    ) {
      throw invalidBackup(`Invalid instruction assignment for agent ${id}`);
    }
    if (typeof state.enabled !== 'boolean') {
      throw invalidBackup(`Invalid enabled state for agent ${id}`);
    }
    if (state.enabled && assignedIds.length === 0) {
      throw invalidBackup(`Enabled agent ${id} has no instructions`);
    }
    const agent: AgentRecord = {
      id,
      instructions: {
        instructionIds: assignedIds,
        enabled: state.enabled,
        createdAt: readTimestamp(state.createdAt, index),
        updatedAt: readTimestamp(state.updatedAt, index),
      },
    };
    ids.add(id);
    return agent;
  });
}

function readTimestamp(value: unknown, index: number): number {
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value < 0
  ) {
    throw invalidBackup(`Invalid timestamp at index ${index}`);
  }
  return value;
}

function invalidBackup(message: string): DataImportError {
  return new DataImportError('INVALID_BACKUP', message);
}
