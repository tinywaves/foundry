import { createWriteStream } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Hono } from 'hono';
import { removeBackupDirectory } from '../../lib/backup/temporary';

import { DataImportError } from './contracts';
import type { DataImportService } from './service';

export function createDataImportRoutes(service: DataImportService, onImported: () => void): Hono {
  const app = new Hono();
  app.post('/', async (c) => {
    let directory: string | undefined;
    try {
      if (c.req.header('content-type')?.split(';', 1)[0].trim() !== 'application/octet-stream' || !c.req.raw.body) {
        throw new DataImportError('INVALID_BACKUP', 'A backup file is required');
      }
      let passphrase: string;
      try {
        passphrase = decodeURIComponent(c.req.header('x-foundry-passphrase') ?? '');
      } catch {
        throw new DataImportError('INVALID_PASSPHRASE', 'Invalid backup passphrase');
      }
      if (!passphrase) {
        throw new DataImportError('INVALID_PASSPHRASE', 'Enter the backup passphrase');
      }
      directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-upload-'));
      const filePath = path.join(directory, 'backup.foundry-backup');
      await pipeline(Readable.fromWeb(c.req.raw.body), createWriteStream(filePath, { mode: 0o600 }));
      await service.importData(filePath, passphrase);
      try {
        onImported();
      } catch {
        console.error('Data was imported, but notifying settings consumers failed');
      }
      return c.json({ status: 'imported' });
    } catch (error) {
      if (error instanceof DataImportError) {
        return c.json({ error: { code: error.code, message: error.message } }, error.code === 'IMPORT_FAILED' ? 500 : 400);
      }
      return c.json({ error: { code: 'IMPORT_FAILED', message: 'Unable to import data' } }, 500);
    } finally {
      if (directory) {
        await removeBackupDirectory(directory);
      }
    }
  });
  return app;
}
