import { zValidator } from '@hono/zod-validator';
import { apiStatusCodes } from '@dhzh/foundry-api-contract';
import type {
  RuntimeConfigurationApplyResponse,
  RuntimeConfigurationPreviewResponse,
  RuntimesResponse,
} from '@dhzh/foundry-api-contract';
import type { Hono } from 'hono';

import { RuntimeOperationError } from './error';
import type { RuntimeService } from './service';
import {
  applyRuntimeConfigurationSchema,
  previewRuntimeConfigurationSchema,
  runtimePathSchema,
  runtimesQuerySchema,
} from './validation';

export function registerRuntimeRoutes(
  app: Hono,
  runtimeService: RuntimeService,
): void {
  app.get(
    '/api/runtimes',
    zValidator('query', runtimesQuerySchema),
    async (context) => context.json({
      status: apiStatusCodes.success,
      data: await runtimeService.listRuntimes(),
    } satisfies RuntimesResponse),
  );

  app.post(
    '/api/runtimes/:runtime/preview',
    zValidator('param', runtimePathSchema),
    zValidator('json', previewRuntimeConfigurationSchema),
    async (context) => {
      try {
        return context.json({
          status: apiStatusCodes.success,
          data: await runtimeService.previewConfiguration(
            context.req.valid('param').runtime,
            context.req.valid('json'),
          ),
        } satisfies RuntimeConfigurationPreviewResponse);
      } catch (error) {
        if (error instanceof RuntimeOperationError) {
          return context.json({
            status: error.status,
            data: null,
            message: error.message,
          } satisfies RuntimeConfigurationPreviewResponse);
        }
        throw error;
      }
    },
  );

  app.post(
    '/api/runtimes/:runtime/apply',
    zValidator('param', runtimePathSchema),
    zValidator('json', applyRuntimeConfigurationSchema),
    async (context) => {
      try {
        return context.json({
          status: apiStatusCodes.success,
          data: await runtimeService.applyConfiguration(
            context.req.valid('param').runtime,
            context.req.valid('json'),
          ),
        } satisfies RuntimeConfigurationApplyResponse);
      } catch (error) {
        if (error instanceof RuntimeOperationError) {
          return context.json({
            status: error.status,
            data: null,
            message: error.message,
          } satisfies RuntimeConfigurationApplyResponse);
        }
        throw error;
      }
    },
  );
}
