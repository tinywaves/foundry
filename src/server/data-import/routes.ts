import type {
  FoundryImportInspectionResponse,
  FoundryImportResponse,
} from '@dhzh/foundry-api-contract';
import {
  apiStatusCodes,
  foundryExportModuleIds,
} from '@dhzh/foundry-api-contract';
import { zValidator } from '@hono/zod-validator';
import type { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import { FoundryImportFileError } from './service';
import type { FoundryImportService } from './service';

const MAX_IMPORT_BYTES = 256 * 1024 * 1024;
const inspectQuerySchema = z.strictObject({});
const selectedModulesSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.split(',') : value),
  z.array(z.enum(foundryExportModuleIds)).min(1)
    .refine((modules) => new Set(modules).size === modules.length),
);
const importQuerySchema = z.strictObject({ modules: selectedModulesSchema });

export function registerDataImportRoutes(
  app: Hono,
  importService: FoundryImportService,
): void {
  app.post(
    '/api/data/import/inspect',
    zValidator('query', inspectQuerySchema),
    bodyLimit({ maxSize: MAX_IMPORT_BYTES }),
    async (context) => {
      try {
        const result = await importService.inspectData(
          new Uint8Array(await context.req.arrayBuffer()),
        );

        return context.json({
          status: apiStatusCodes.success,
          data: result,
        } satisfies FoundryImportInspectionResponse);
      } catch (error) {
        if (error instanceof FoundryImportFileError) {
          return context.json({ message: error.message }, 400);
        }
        throw error;
      }
    },
  );

  app.post(
    '/api/data/import',
    zValidator('query', importQuerySchema),
    bodyLimit({ maxSize: MAX_IMPORT_BYTES }),
    async (context) => {
      try {
        const result = await importService.importData(
          new Uint8Array(await context.req.arrayBuffer()),
          context.req.valid('query').modules,
        );

        return context.json({
          status: apiStatusCodes.success,
          data: result,
        } satisfies FoundryImportResponse);
      } catch (error) {
        if (error instanceof FoundryImportFileError) {
          return context.json({ message: error.message }, 400);
        }
        throw error;
      }
    },
  );
}
