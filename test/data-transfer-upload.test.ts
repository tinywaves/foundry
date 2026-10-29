import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Hono } from 'hono';
import { expect, it } from 'vitest';
import { createCaptureRuntime } from '../src/features/captures/runtime';
import { createDataTransferRoutes } from '../src/features/data-transfer/routes';
import { DataTransferService } from '../src/features/data-transfer/service';
import { WorkspaceMutationGate } from '../src/features/data-transfer/workspace-mutation';
import { openFoundryDatabase } from '../src/storage/database';

const { join } = path;

it('streams archive uploads with an explicit size limit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-transfer-upload-'));
  const settingsPath = join(directory, 'settings.json');
  const transferRoot = join(directory, '.data-transfer');
  const database = openFoundryDatabase(join(directory, 'foundry.sqlite'));
  const captureRuntime = createCaptureRuntime(database, settingsPath);
  const transfer = new DataTransferService(
    database,
    settingsPath,
    captureRuntime.runner,
    transferRoot,
    '0.0.0',
    new WorkspaceMutationGate(),
  );
  const passphrase = '备份 passphrase';
  const app = new Hono();
  app.route(
    '/api/data-transfer',
    createDataTransferRoutes(transfer, () => {}, {
      maximumUploadBytes: 1024 * 1024,
    }),
  );

  try {
    transfer.cleanupStaleTransfers();
    const exported = await transfer.createExport(passphrase);
    const archive = await readFile(exported.filePath);
    const response = await app.request('/api/data-transfer/inspect', {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'x-foundry-filename': encodeURIComponent('Weekly 备份.foundry-backup'),
        'x-foundry-passphrase': encodeURIComponent(passphrase),
      },
      body: archive,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      fileName: 'Weekly 备份.foundry-backup',
    });
    const transferEntries = await readdir(transferRoot);
    expect(transferEntries.some((entry) => entry.startsWith('upload-'))).toBe(false);

    const oversizedResponse = await app.request('/api/data-transfer/inspect', {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'x-foundry-filename': encodeURIComponent('too-large.foundry-backup'),
        'x-foundry-passphrase': encodeURIComponent(passphrase),
      },
      body: new Uint8Array((1024 * 1024) + 1),
    });
    expect(oversizedResponse.status).toBe(400);
    expect(await oversizedResponse.json()).toMatchObject({
      error: {
        code: 'INVALID_ARCHIVE',
        message: 'The Foundry archive is too large',
      },
    });
    const entriesAfterOversizedUpload = await readdir(transferRoot);
    expect(entriesAfterOversizedUpload.some((entry) => entry.startsWith('upload-'))).toBe(false);
  } finally {
    database.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
