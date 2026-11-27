import { randomUUID } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import type {
  Agent,
  AgentInstructionsRecord,
  AgentRecord,
} from '@dhzh/foundry-shared';

import { openPath } from '../../lib/open-path';
import { syncDirectory } from '../../storage/files';
import type { FoundryStorage } from '../../storage/store';
import { InstructionsService } from '../instructions/service';
import { AgentError } from './contracts';
import { getAgentDefinitions } from './definitions';
import type { AgentDefinition } from './definitions';
import {
  removeInstructionBlocks,
  renderInstructionDocument,
} from './document';
import {
  getAgentRecord,
  listAgentRecords,
  saveAgentRecord,
} from './repository';

export class AgentsService {
  private readonly definitions: AgentDefinition[];

  constructor(
    private readonly storage: FoundryStorage,
    private readonly instructionsService: InstructionsService
      = new InstructionsService(storage),
    homeDirectory = os.homedir(),
    private readonly openFile: (path: string) => void = openPath,
  ) {
    this.definitions = getAgentDefinitions(homeDirectory);
  }

  private requireDefinition(agentId: string): AgentDefinition {
    const definition = this.definitions.find(({ id }) => id === agentId);
    if (!definition) {
      throw new AgentError(
        'AGENT_NOT_FOUND',
        `Unknown agent: ${agentId}`,
        404,
      );
    }
    return definition;
  }

  private readAssignedInstructions(instructionIds: string[]) {
    const instructions = new Map(
      this.instructionsService.list().map((instruction) => [
        instruction.id,
        instruction,
      ]),
    );
    return instructionIds.map((instructionId) => {
      const instruction = instructions.get(instructionId);
      if (!instruction) {
        throw new AgentError(
          'UNKNOWN_INSTRUCTION',
          `Unknown instruction: ${instructionId}`,
          400,
        );
      }
      return instruction;
    });
  }

  private writeAgentDocument(
    definition: AgentDefinition,
    contents: string[],
    isRemoval: boolean,
  ): void {
    const hasFile = existsSync(definition.filePath);
    if (isRemoval && !hasFile) {
      return;
    }
    const existing = hasFile
      ? readFileSync(definition.filePath, 'utf8')
      : '';
    const next = isRemoval
      ? removeInstructionBlocks(existing)
      : renderInstructionDocument(existing, contents);
    writeExternalTextAtomic(definition.filePath, next);
  }

  list(): Agent[] {
    const records = new Map(
      listAgentRecords(this.storage).map((record) => [record.id, record]),
    );
    return this.definitions.map((definition) => toAgent(
      definition,
      (records.get(definition.id) ?? defaultRecord(definition.id)).instructions,
    ));
  }

  updateInstructions(agentId: string, instructionIds: string[]): Agent {
    const definition = this.requireDefinition(agentId);
    const instructions = this.readAssignedInstructions(instructionIds);

    return this.storage.transaction(() => {
      const record = getAgentRecord(this.storage, agentId)
        ?? defaultRecord(agentId);
      const current = record.instructions;
      const isEnabled = instructionIds.length > 0 && current.enabled;
      if (current.enabled) {
        this.writeAgentDocument(
          definition,
          instructions.map(({ content }) => content),
          instructionIds.length === 0,
        );
      }
      const updatedAt = Date.now();
      const saved = saveAgentRecord(this.storage, {
        ...record,
        instructions: {
          ...current,
          instructionIds,
          enabled: isEnabled,
          updatedAt,
        },
      });

      return toAgent(definition, saved.instructions);
    });
  }

  setEnabled(agentId: string, isEnabled: boolean): Agent {
    const definition = this.requireDefinition(agentId);

    return this.storage.transaction(() => {
      const record = getAgentRecord(this.storage, agentId)
        ?? defaultRecord(agentId);
      const current = record.instructions;
      if (isEnabled) {
        if (current.instructionIds.length === 0) {
          throw new AgentError(
            'AGENT_HAS_NO_INSTRUCTIONS',
            'Add at least one instruction before enabling this agent',
            400,
          );
        }
        const instructions = this.readAssignedInstructions(current.instructionIds);
        this.writeAgentDocument(
          definition,
          instructions.map(({ content }) => content),
          false,
        );
      } else {
        this.writeAgentDocument(definition, [], true);
      }

      const updatedAt = Date.now();
      return toAgent(definition, saveAgentRecord(this.storage, {
        ...record,
        instructions: {
          ...current,
          enabled: isEnabled,
          updatedAt,
        },
      }).instructions);
    });
  }

  reapply(agentId: string): Agent {
    const definition = this.requireDefinition(agentId);

    return this.storage.transaction(() => {
      const record = getAgentRecord(this.storage, agentId)
        ?? defaultRecord(agentId);
      const current = record.instructions;
      if (!current.enabled) {
        throw new AgentError(
          'AGENT_DISABLED',
          'Enable this agent before reapplying its instructions',
          409,
        );
      }
      const instructions = this.readAssignedInstructions(current.instructionIds);
      this.writeAgentDocument(
        definition,
        instructions.map(({ content }) => content),
        false,
      );

      const updatedAt = Date.now();
      return toAgent(definition, saveAgentRecord(this.storage, {
        ...record,
        instructions: {
          ...current,
          updatedAt,
        },
      }).instructions);
    });
  }

  openInstructionFile(agentId: string): { path: string } {
    const definition = this.requireDefinition(agentId);
    if (!existsSync(definition.filePath)) {
      throw new AgentError(
        'AGENT_FILE_NOT_FOUND',
        `Instruction file does not exist: ${definition.instructionFile}`,
        404,
      );
    }
    this.openFile(definition.filePath);
    return { path: definition.instructionFile };
  }
}

function toAgent(
  definition: AgentDefinition,
  record: AgentInstructionsRecord,
): Agent {
  return {
    id: definition.id,
    name: definition.name,
    icon: definition.icon,
    instructionFile: definition.instructionFile,
    enabled: record.enabled,
    instructionIds: record.instructionIds,
  };
}

function defaultRecord(id: string): AgentRecord {
  const now = Date.now();
  return {
    id,
    instructions: {
      instructionIds: [],
      enabled: false,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function writeExternalTextAtomic(filename: string, contents: string): void {
  const directory = path.dirname(filename);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const mode = existsSync(filename)
    ? statSync(filename).mode & 0o777
    : 0o600;
  const temporary = `${filename}.${randomUUID()}.tmp`;

  try {
    const fd = openSync(temporary, 'wx', mode);
    try {
      if (process.platform !== 'win32') {
        chmodSync(temporary, mode);
      }
      writeFileSync(fd, contents);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(temporary, filename);
    syncDirectory(directory);
  } finally {
    rmSync(temporary, { force: true });
  }
}
