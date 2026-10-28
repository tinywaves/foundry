import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { getFoundryDataTransferPath } from '../../storage/paths';
import {
  DataTransferError,
  normalizeDataTransferError,
} from './errors';
import type { DataTransferService } from './service';

export function createDataTransferRoutes(service: DataTransferService): Hono {
  const app = new Hono();

  app.get('/status', (c) => c.json(service.getStatus()));

  app.post('/export', async (c) => {
    try {
      const passphrase = await readPassphrase(c);
      const result = await service.createExport(passphrase);
      const stream = createReadStream(result.filePath);
      stream.on('close', () => {
        void service.removeExportFile(result.filePath);
      });

      return c.body(Readable.toWeb(stream) as ReadableStream, 200, {
        'content-type': 'application/octet-stream',
        'content-disposition': `attachment; filename="${path.basename(result.filePath)}"`,
        'x-foundry-provider-count': String(result.providerCount),
        'x-foundry-capture-count': String(result.captureCount),
        'x-foundry-job-count': String(result.jobCount),
      });
    } catch (error) {
      return dataTransferError(c, error);
    }
  });

  app.post('/inspect', async (c) => {
    const uploadPath = path.join(
      getFoundryDataTransferPath(),
      `upload-${randomUUID()}.foundry-backup`,
    );

    try {
      const form = await c.req.formData();
      const file = form.get('file');
      const passphrase = form.get('passphrase');
      if (typeof passphrase !== 'string' || !(file instanceof File)) {
        throw new DataTransferError(
          'INVALID_ARCHIVE',
          'A Foundry backup file and passphrase are required',
        );
      }

      await mkdir(path.dirname(uploadPath), { recursive: true, mode: 0o700 });
      await writeFile(uploadPath, Buffer.from(await file.arrayBuffer()), {
        mode: 0o600,
      });
      return c.json(await service.inspectImport(uploadPath, passphrase));
    } catch (error) {
      return dataTransferError(c, error);
    } finally {
      await rm(uploadPath, { force: true });
    }
  });

  app.post('/imports/:id/commit', async (c) => {
    try {
      await service.commitImport(c.req.param('id'));
      return c.json({ status: 'imported' });
    } catch (error) {
      return dataTransferError(c, error);
    }
  });

  app.delete('/imports/:id', async (c) => {
    try {
      await service.cancelImport(c.req.param('id'));
      return c.body(null, 204);
    } catch (error) {
      return dataTransferError(c, error);
    }
  });

  return app;
}

async function readPassphrase(c: Context): Promise<string> {
  try {
    const body: unknown = await c.req.json();
    if (
      typeof body !== 'object'
      || body === null
      || !('passphrase' in body)
      || typeof body.passphrase !== 'string'
    ) {
      throw new DataTransferError('PASSPHRASE_REQUIRED', 'Enter a passphrase');
    }
    return body.passphrase;
  } catch (error) {
    if (error instanceof DataTransferError) {
      throw error;
    }
    throw new DataTransferError('PASSPHRASE_REQUIRED', 'Enter a passphrase');
  }
}

function dataTransferError(c: Context, error: unknown) {
  const transferError = normalizeDataTransferError(error);
  return c.json(
    {
      error: {
        code: transferError.code,
        message: transferError.message,
      },
    },
    dataTransferStatus(transferError.code),
  );
}

function dataTransferStatus(code: DataTransferError['code']): 400 | 404 | 409 | 500 {
  switch (code) {
    case 'IMPORT_NOT_FOUND': {
      return 404;
    }
    case 'ACTIVE_JOBS':
    case 'BUSY': {
      return 409;
    }
    case 'IO_ERROR': {
      return 500;
    }
    default: {
      return 400;
    }
  }
}
