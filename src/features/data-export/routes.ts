import { Hono } from 'hono';

import { DataExportInputError, parseDataExportInput } from './contracts';
import type { DataExportService } from './service';

export function createDataExportRoutes(service: DataExportService): Hono {
  const app = new Hono();
  app.post('/', async (c) => {
    try {
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        throw new DataExportInputError('Request body must be valid JSON');
      }
      const { passphrase } = parseDataExportInput(body);
      const result = await service.createExport(passphrase);
      return c.body(result.contents, 200, {
        'content-type': 'application/octet-stream',
        'content-disposition': `attachment; filename="${result.fileName}"`,
        'cache-control': 'no-store',
      });
    } catch (error) {
      return error instanceof DataExportInputError ? c.json({ error: { code: error.code, message: error.message } }, 400) : c.json({ error: { code: 'DATA_EXPORT_FAILED', message: 'Unable to export data' } }, 500);
    }
  });
  return app;
}
