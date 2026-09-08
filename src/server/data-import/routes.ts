import type { FoundryImportResponse } from '@dhzh/foundry-api-contract';
import { apiStatusCodes } from '@dhzh/foundry-api-contract';
import { zValidator } from '@hono/zod-validator';
import type { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import { FoundryImportFileError } from './service';
import type { FoundryImportService } from './service';

const MAX_IMPORT_BYTES = 256 * 1024 * 1024;
const importQuerySchema = z.strictObject({});

export function registerDataImportRoutes(
  app: Hono,
  importService: FoundryImportService,
): void {
  app.post(
    '/api/data/import',
    zValidator('query', importQuerySchema),
    bodyLimit({ maxSize: MAX_IMPORT_BYTES }),
    async (context) => {
      try {
        const result = await importService.importData(
          new Uint8Array(await context.req.arrayBuffer()),
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
