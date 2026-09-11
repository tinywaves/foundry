import { apiStatusCodes } from '@dhzh/foundry-api-contract';
import type {
  PromptDeleteResponse,
  PromptDetailResponse,
  PromptResponse,
  PromptsResponse,
  PromptUpdateResponse,
} from '@dhzh/foundry-api-contract';
import { zValidator } from '@hono/zod-validator';
import type { Hono } from 'hono';

import type { PromptStore } from './store';
import { toPromptSummary } from './store';
import {
  promptCreationSchema,
  promptPathSchema,
  promptsQuerySchema,
} from './validation';

export function registerPromptRoutes(app: Hono, promptStore: PromptStore): void {
  app.get(
    '/api/prompts',
    zValidator('query', promptsQuerySchema),
    (context) => context.json({
      data: promptStore.listPrompts(context.req.valid('query')),
      status: apiStatusCodes.success,
    } satisfies PromptsResponse),
  );

  app.post(
    '/api/prompts',
    zValidator('json', promptCreationSchema),
    (context) => {
      const prompt = promptStore.createPrompt(context.req.valid('json'));
      return context.json({
        data: toPromptSummary(prompt),
        status: apiStatusCodes.success,
      } satisfies PromptResponse, 201);
    },
  );

  app.delete(
    '/api/prompts/:promptId',
    zValidator('param', promptPathSchema),
    (context) => {
      const isDeleted = promptStore.deletePrompt(
        context.req.valid('param').promptId,
      );
      if (!isDeleted) {
        return context.json({
          data: false,
          message: 'The selected Prompt is unavailable.',
          status: apiStatusCodes.promptNotFound,
        } satisfies PromptDeleteResponse);
      }
      return context.json({
        data: true,
        status: apiStatusCodes.success,
      } satisfies PromptDeleteResponse);
    },
  );

  app.get(
    '/api/prompts/:promptId',
    zValidator('param', promptPathSchema),
    (context) => {
      const prompt = promptStore.getPrompt(context.req.valid('param').promptId);
      return prompt === null
        ? context.json({
          data: null,
          message: 'The selected Prompt is unavailable.',
          status: apiStatusCodes.promptNotFound,
        } satisfies PromptDetailResponse)
        : context.json({
          data: prompt,
          status: apiStatusCodes.success,
        } satisfies PromptDetailResponse);
    },
  );

  app.put(
    '/api/prompts/:promptId',
    zValidator('param', promptPathSchema),
    zValidator('json', promptCreationSchema),
    (context) => {
      const prompt = promptStore.updatePrompt(
        context.req.valid('param').promptId,
        context.req.valid('json'),
      );
      return prompt === null
        ? context.json({
          data: null,
          message: 'The selected Prompt is unavailable.',
          status: apiStatusCodes.promptNotFound,
        } satisfies PromptUpdateResponse)
        : context.json({
          data: toPromptSummary(prompt),
          status: apiStatusCodes.success,
        } satisfies PromptUpdateResponse);
    },
  );
}
