import { Buffer } from 'node:buffer';
import type {
  CreatePromptInput,
  PromptVersionTarget,
  UpdatePromptInput,
} from '../../shared/prompt-contract';
import {
  PROMPT_CONTENT_MAX_UTF8_BYTES,
  PROMPT_DESCRIPTION_MAX_CODE_POINTS,
  PROMPT_TITLE_MAX_CODE_POINTS,
} from '../../shared/prompt-contract';
import { invalidPromptField, PromptOperationError } from './prompt-error';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePromptId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    return invalidPromptField('id', 'Provide a valid Prompt ID.');
  }
  return value;
}

export function parsePromptVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    return invalidPromptField('version', 'Provide a valid Prompt version.');
  }
  return value;
}

export function parseCreatePromptInput(value: unknown): CreatePromptInput {
  const input = requireRecord(value, 'prompt');
  return {
    title: parsePromptTitle(input.title),
    description: parsePromptDescription(input.description),
    content: parsePromptContent(input.content),
  };
}

export function parseUpdatePromptInput(value: unknown): UpdatePromptInput {
  const input = requireRecord(value, 'prompt');
  return {
    ...parseCreatePromptInput(input),
    id: parsePromptId(input.id),
  };
}

export function parsePromptVersionTarget(value: unknown): PromptVersionTarget {
  const target = requireRecord(value, 'version');
  return {
    id: parsePromptId(target.id),
    version: parsePromptVersion(target.version),
  };
}

export function parseStoredPromptSnapshot(
  titleValue: unknown,
  descriptionValue: unknown,
  contentValue: unknown,
): CreatePromptInput {
  try {
    const stored = {
      title: titleValue,
      description: descriptionValue,
      content: contentValue,
    };
    const parsed = parseCreatePromptInput(stored);
    if (
      parsed.title !== titleValue
      || parsed.description !== descriptionValue
      || parsed.content !== contentValue
    ) {
      throw new Error('Stored Prompt values are not normalized.');
    }
    return parsed;
  } catch {
    throw new PromptOperationError('storage-corrupt', 'Stored Prompt data is invalid.');
  }
}

function parsePromptTitle(value: unknown): string {
  if (typeof value !== 'string') {
    return invalidPromptField('title', 'This field must be text.');
  }
  const title = value.trim();
  if (title === '') {
    return invalidPromptField('title', 'This field is required.');
  }
  if (countCodePoints(title) > PROMPT_TITLE_MAX_CODE_POINTS) {
    return invalidPromptField(
      'title',
      `Use at most ${PROMPT_TITLE_MAX_CODE_POINTS} characters.`,
    );
  }
  if (hasControlCharacters(title)) {
    return invalidPromptField('title', 'Control characters are not allowed.');
  }
  return title;
}

function parsePromptDescription(value: unknown): string | null {
  if ([null, undefined, ''].includes(value as null | undefined | string)) {
    return null;
  }
  if (typeof value !== 'string') {
    return invalidPromptField('description', 'This field must be text.');
  }
  const description = value.trim();
  if (description === '') {
    return null;
  }
  if (countCodePoints(description) > PROMPT_DESCRIPTION_MAX_CODE_POINTS) {
    return invalidPromptField(
      'description',
      `Use at most ${PROMPT_DESCRIPTION_MAX_CODE_POINTS} characters.`,
    );
  }
  return description;
}

function parsePromptContent(value: unknown): string {
  if (typeof value !== 'string') {
    return invalidPromptField('content', 'This field must be text.');
  }
  if (value.trim() === '') {
    return invalidPromptField('content', 'This field is required.');
  }
  if (Buffer.byteLength(value, 'utf8') > PROMPT_CONTENT_MAX_UTF8_BYTES) {
    return invalidPromptField(
      'content',
      `Use at most ${PROMPT_CONTENT_MAX_UTF8_BYTES} bytes of UTF-8 text.`,
    );
  }
  return value;
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalidPromptField(field, 'Provide an object value.');
  }
  return value as Record<string, unknown>;
}

function countCodePoints(value: string): number {
  let count = 0;
  for (const _character of value) {
    count += 1;
  }
  return count;
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1F || codePoint === 0x7F) {
      return true;
    }
  }
  return false;
}
