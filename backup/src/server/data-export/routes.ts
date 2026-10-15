import { zValidator } from '@hono/zod-validator';
import { foundryExportMediaType } from '@dhzh/foundry-api-contract';
import type { Hono } from 'hono';
import { z } from 'zod';

import type { FoundryExportService } from './service';

const exportQuerySchema = z.strictObject({});

export function registerDataExportRoutes(
  app: Hono,
  exportService: FoundryExportService,
): void {
  app.get(
    '/api/data/export',
    zValidator('query', exportQuerySchema),
    async () => {
      const exported = await exportService.createExport();

      return new Response(exported.content, {
        headers: {
          'cache-control': 'no-store',
          'content-disposition': `attachment; filename="${exported.filename}"`,
          'content-length': String(exported.content.byteLength),
          'content-type': foundryExportMediaType,
          'x-content-type-options': 'nosniff',
        },
      });
    },
  );
}
