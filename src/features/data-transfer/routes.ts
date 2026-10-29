import type { Buffer } from 'node:buffer';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { MAXIMUM_ARCHIVE_BYTES } from './archive';
import {
  DataTransferError,
  normalizeDataTransferError,
} from './errors';
import type { DataTransferService } from './service';

const MAXIMUM_IMPORT_UPLOAD_BYTES = MAXIMUM_ARCHIVE_BYTES + 1024 * 1024;

interface DataTransferRouteOptions {
  maximumUploadBytes?: number;
}

export function createDataTransferRoutes(
  service: DataTransferService,
  onImported: () => void = () => {},
  {
    maximumUploadBytes = MAXIMUM_IMPORT_UPLOAD_BYTES,
  }: DataTransferRouteOptions = {},
): Hono {
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
    let upload: Awaited<ReturnType<DataTransferService['createUploadTarget']>> | undefined;

    try {
      const contentType = c.req.header('content-type')
        ?.split(';', 1)[0]
        ?.trim()
        .toLowerCase();
      if (contentType !== 'application/octet-stream') {
        throw new DataTransferError(
          'INVALID_ARCHIVE',
          'The Foundry backup must be uploaded as application/octet-stream',
        );
      }

      assertUploadLength(c, maximumUploadBytes);
      const passphrase = readEncodedHeader(c, 'x-foundry-passphrase');
      if (!passphrase) {
        throw new DataTransferError('PASSPHRASE_REQUIRED', 'Enter a passphrase');
      }

      const originalFileName = readEncodedHeader(c, 'x-foundry-filename')
        ?.trim() || 'foundry.foundry-backup';
      upload = await service.createUploadTarget();
      await receiveUpload(c, upload.filePath, maximumUploadBytes);
      return c.json(
        await service.inspectImport(upload.filePath, passphrase, originalFileName),
      );
    } catch (error) {
      return dataTransferError(c, error);
    } finally {
      await upload?.cleanup();
    }
  });

  app.post('/imports/:id/commit', async (c) => {
    try {
      await service.commitImport(c.req.param('id'));
      onImported();
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

async function receiveUpload(
  c: Context,
  uploadPath: string,
  maximumBytes: number,
): Promise<void> {
  const body = c.req.raw.body;
  if (!body) {
    throw new DataTransferError(
      'INVALID_ARCHIVE',
      'A Foundry backup file is required',
    );
  }

  let receivedBytes = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      receivedBytes += chunk.byteLength;
      if (receivedBytes > maximumBytes) {
        callback(new DataTransferError('INVALID_ARCHIVE', 'The Foundry archive is too large'));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(body),
      limiter,
      createWriteStream(uploadPath, { mode: 0o600 }),
    );
  } catch (error) {
    if (error instanceof DataTransferError) {
      throw error;
    }
    throw new DataTransferError(
      'IO_ERROR',
      'Unable to receive the Foundry archive',
      { cause: error },
    );
  }

  if (receivedBytes === 0) {
    throw new DataTransferError(
      'INVALID_ARCHIVE',
      'A Foundry backup file is required',
    );
  }
}

function assertUploadLength(c: Context, maximumBytes: number): void {
  const contentLength = c.req.header('content-length');
  if (contentLength === undefined) {
    return;
  }

  const length = Number(contentLength);
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new DataTransferError('INVALID_ARCHIVE', 'The upload length is invalid');
  }
  if (length > maximumBytes) {
    throw new DataTransferError('INVALID_ARCHIVE', 'The Foundry archive is too large');
  }
}

function readEncodedHeader(c: Context, name: string): string | undefined {
  const value = c.req.header(name);
  if (value === undefined) {
    return undefined;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    throw new DataTransferError('INVALID_ARCHIVE', `The ${name} header is invalid`);
  }
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
