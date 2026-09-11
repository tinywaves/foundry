import type { CreatePromptRequest } from '@dhzh/foundry-api-contract';
import { z } from 'zod';

const MAX_PROMPT_CONTENT_BYTES = 1024 * 1024;
const textEncoder = new TextEncoder();

const titleSchema = z.string().trim().min(1).max(100);
const descriptionSchema = z.string().trim().max(2000).nullable().transform(
  (value) => (value === '' ? null : value),
);
const contentSchema = z.string()
  .refine((value) => value.trim().length > 0, {
    message: 'Prompt content is required.',
  })
  .refine((value) => textEncoder.encode(value).byteLength <= MAX_PROMPT_CONTENT_BYTES, {
    message: 'Prompt content must be no larger than 1 MiB.',
  });
export const promptCreationSchema = z.strictObject({
  content: contentSchema,
  description: descriptionSchema,
  title: titleSchema,
});

export const promptPathSchema = z.strictObject({
  promptId: z.string().min(1),
});

export const promptsQuerySchema = z.strictObject({
  query: z.string().trim().max(500).optional().default(''),
});

export function normalizePromptSearchValue(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US');
}

export function parseCreatePromptRequest(input: unknown): CreatePromptRequest {
  return promptCreationSchema.parse(input);
}
