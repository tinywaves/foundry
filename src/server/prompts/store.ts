import type {
  CreatePromptRequest,
  Prompt,
  PromptList,
  PromptSummary,
} from '@dhzh/foundry-api-contract';
import { and, eq, isNull } from 'drizzle-orm';
import { randomUUIDv7 } from 'node:crypto';

import type { FoundryDatabase } from '../database';
import { prompts } from '../database/schema';
import { normalizePromptSearchValue, parseCreatePromptRequest } from './validation';

export interface ListPromptsOptions {
  query: string;
}

export interface PromptStore {
  createPrompt: (input: CreatePromptRequest) => Prompt;
  createPrompts: (inputs: CreatePromptRequest[]) => Prompt[];
  deletePrompt: (id: string) => boolean;
  getPrompt: (id: string) => Prompt | null;
  listAllPrompts: () => Prompt[];
  listPrompts: (options: ListPromptsOptions) => PromptList;
  updatePrompt: (id: string, input: CreatePromptRequest) => Prompt | null;
}

type PromptRow = typeof prompts.$inferSelect;

function mapPrompt(row: PromptRow): Prompt {
  return {
    content: row.content,
    createdAt: row.createdAt,
    description: row.description,
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
  };
}

export function toPromptSummary(prompt: Prompt): PromptSummary {
  return {
    createdAt: prompt.createdAt,
    description: prompt.description,
    excerpt: prompt.content.replaceAll(/\s+/gu, ' ').trim().slice(0, 240),
    id: prompt.id,
    title: prompt.title,
    updatedAt: prompt.updatedAt,
  };
}

function isPromptMatchingQuery(prompt: Prompt, query: string): boolean {
  const normalizedQuery = normalizePromptSearchValue(query);
  if (normalizedQuery === '') {
    return true;
  }

  return [
    prompt.title,
    prompt.description ?? '',
    prompt.content,
  ].some((value) => normalizePromptSearchValue(value).includes(normalizedQuery));
}

export class DrizzlePromptStore implements PromptStore {
  constructor(
    private readonly database: FoundryDatabase['db'],
    private readonly now: () => number = Date.now,
    private readonly createId: () => string = randomUUIDv7,
  ) {}

  createPrompt(rawInput: CreatePromptRequest): Prompt {
    const input = parseCreatePromptRequest(rawInput);
    const timestamp = this.now();
    const id = this.createId();

    this.database.insert(prompts).values({
      ...input,
      createdAt: timestamp,
      deletedAt: null,
      id,
      updatedAt: timestamp,
    }).run();

    return {
      ...input,
      createdAt: timestamp,
      id,
      updatedAt: timestamp,
    };
  }

  createPrompts(inputs: CreatePromptRequest[]): Prompt[] {
    return this.database.transaction(() =>
      inputs.map((input) => this.createPrompt(input)));
  }

  deletePrompt(id: string): boolean {
    return this.database.update(prompts).set({
      deletedAt: this.now(),
    }).where(
      and(eq(prompts.id, id), isNull(prompts.deletedAt)),
    ).run().changes > 0;
  }

  getPrompt(id: string): Prompt | null {
    const row = this.database.select().from(prompts).where(
      and(eq(prompts.id, id), isNull(prompts.deletedAt)),
    ).get();
    return row ? mapPrompt(row) : null;
  }

  listAllPrompts(): Prompt[] {
    return this.database.select().from(prompts).where(
      isNull(prompts.deletedAt),
    ).all().map((row) => mapPrompt(row));
  }

  listPrompts(options: ListPromptsOptions): PromptList {
    const items = this.listAllPrompts()
      .filter((prompt) => isPromptMatchingQuery(prompt, options.query))
      .toSorted((left, right) =>
        right.updatedAt - left.updatedAt || right.id.localeCompare(left.id))
      .map((prompt) => toPromptSummary(prompt));

    return { items };
  }

  updatePrompt(id: string, rawInput: CreatePromptRequest): Prompt | null {
    if (this.getPrompt(id) === null) {
      return null;
    }

    const input = parseCreatePromptRequest(rawInput);
    this.database.update(prompts).set({
      ...input,
      updatedAt: this.now(),
    }).where(
      and(eq(prompts.id, id), isNull(prompts.deletedAt)),
    ).run();

    return this.getPrompt(id);
  }
}
