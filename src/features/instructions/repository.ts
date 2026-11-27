import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import type { CreateInstructionInput, Instruction } from '@dhzh/foundry-shared';

import { writeTextAtomic } from '../../storage/files';
import type { FoundryStorage } from '../../storage/store';
import { INSTRUCTION_NAME_MAX_LENGTH } from './contracts';

const INSTRUCTIONS_DIRECTORY = 'instructions';
const INSTRUCTION_FILE_SUFFIX = '.md';
const INSTRUCTION_ID_PATTERN
  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

interface InstructionFrontmatter {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function createInstruction(
  input: CreateInstructionInput,
  storage: FoundryStorage,
): Instruction {
  const now = new Date().toISOString();
  const instruction: Instruction = {
    id: randomUUID(),
    name: input.name,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };
  const filename = instructionPath(storage, instruction.id);
  const markdown = serializeInstruction(instruction);

  storage.transaction(() => {
    writeTextAtomic(filename, markdown);
  });

  return instruction;
}

export function listInstructions(storage: FoundryStorage): Instruction[] {
  const directory = instructionsDirectory(storage);
  let filenames: string[];
  try {
    filenames = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(INSTRUCTION_FILE_SUFFIX))
      .map((entry) => entry.name);
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }
    throw error;
  }

  return filenames
    .map((filename) => readInstructionFile(path.join(directory, filename), filename))
    .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function serializeInstruction(instruction: Instruction): string {
  const frontmatter = stringify({
    id: instruction.id,
    name: instruction.name,
    createdAt: instruction.createdAt,
    updatedAt: instruction.updatedAt,
  } satisfies InstructionFrontmatter).trimEnd();

  return `---\n${frontmatter}\n---\n\n${instruction.content}`;
}

export function parseInstructionMarkdown(markdown: string, filename: string): Instruction {
  const frontmatterMatch = FRONTMATTER_PATTERN.exec(markdown);
  if (!frontmatterMatch) {
    throw invalidInstructionFile(filename);
  }

  const frontmatter = readFrontmatter(frontmatterMatch[1]);
  if (`${frontmatter.id}${INSTRUCTION_FILE_SUFFIX}` !== filename) {
    throw invalidInstructionFile(filename);
  }

  let content = markdown.slice(frontmatterMatch[0].length);
  if (content.startsWith('\r\n')) {
    content = content.slice(2);
  } else if (content.startsWith('\n')) {
    content = content.slice(1);
  }

  return {
    ...frontmatter,
    content,
  };
}

function readInstructionFile(filename: string, basename: string): Instruction {
  return parseInstructionMarkdown(readFileSync(filename, 'utf8'), basename);
}

function readFrontmatter(source: string): InstructionFrontmatter {
  let value: unknown;
  try {
    value = parse(source);
  } catch {
    throw invalidInstructionFile('frontmatter');
  }
  if (!isRecord(value)) {
    throw invalidInstructionFile('frontmatter');
  }

  const id = readString(value.id);
  const name = readString(value.name);
  if (!name || name.length > INSTRUCTION_NAME_MAX_LENGTH || !INSTRUCTION_ID_PATTERN.test(id)) {
    throw invalidInstructionFile('frontmatter');
  }
  const createdAt = readTimestamp(value.createdAt);
  const updatedAt = readTimestamp(value.updatedAt);

  return { id, name, createdAt, updatedAt };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readTimestamp(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw invalidInstructionFile('frontmatter');
  }
  return value;
}

function instructionsDirectory(storage: FoundryStorage): string {
  return path.join(storage.path, INSTRUCTIONS_DIRECTORY);
}

function instructionPath(storage: FoundryStorage, id: string): string {
  if (!INSTRUCTION_ID_PATTERN.test(id)) {
    throw new Error('Invalid instruction ID');
  }
  return path.join(instructionsDirectory(storage), `${id}${INSTRUCTION_FILE_SUFFIX}`);
}

function invalidInstructionFile(filename: string): Error {
  return new Error(`Invalid instruction file: ${filename}`);
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && Reflect.get(error, 'code') === 'ENOENT';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
