import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createCaptureRuntime } from '../src/features/captures/runtime';
import { createFoundryArchive } from '../src/features/data-transfer/archive';
import { encryptExportFile } from '../src/features/data-transfer/crypto';
import { DATA_ENTRY_PATH, DATA_EXPORT_FORMAT, MANIFEST_ENTRY_PATH, parseExportManifest } from '../src/features/data-transfer/format';
import { DataTransferService } from '../src/features/data-transfer/service';
import { WorkspaceMutationGate } from '../src/features/data-transfer/workspace-mutation';
import { openFoundryStorage } from '../src/storage/index';

it('rejects JSON archives with invalid provider records before replacing live data', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-json-validation-'));
  const target = openFoundryStorage(directory);
  const transfer = new DataTransferService(target, createCaptureRuntime(target).runner, path.join(directory, 'transfers'), '0.0.0', new WorkspaceMutationGate());
  try {
    const snapshot = target.snapshot();
    const now = new Date().toISOString();
    const snapshotPath = path.join(directory, 'snapshot.json');
    await writeFile(snapshotPath, JSON.stringify({ ...snapshot, providers: [{ id: 'broken', name: 'Broken provider', protocol: 'openai-responses', baseURL: 'https://example.com', apiKey: 'secret', customModels: [{}], status: 'active', createdAt: now, updatedAt: now, deletedAt: null }] }));
    const manifestPath = path.join(directory, 'archive-manifest.json');
    await writeFile(manifestPath, JSON.stringify({ format: DATA_EXPORT_FORMAT, archiveVersion: 3, appVersion: '0.0.0', createdAt: now, data: { ...await fileRecord(snapshotPath, DATA_ENTRY_PATH), formatVersion: 1 } }));
    const zipPath = path.join(directory, 'archive.zip');
    const backupPath = path.join(directory, 'invalid.foundry-backup');
    await createFoundryArchive([{ entryPath: MANIFEST_ENTRY_PATH, filePath: manifestPath }, { entryPath: DATA_ENTRY_PATH, filePath: snapshotPath }], zipPath);
    await encryptExportFile(zipPath, backupPath, 'passphrase');
    await expect(transfer.inspectImport(backupPath, 'passphrase')).rejects.toMatchObject({ code: 'INVALID_ARCHIVE', message: 'A provider record is invalid' });
    expect(target.snapshot()).toEqual(snapshot);
  } finally {
    target.close();
    await rm(directory, { recursive: true, force: true });
  }
});
it.each([1, 2])('rejects old SQLite archive version %i', (archiveVersion) => {
  expect(() => parseExportManifest({
    format: DATA_EXPORT_FORMAT,
    archiveVersion,
  })).toThrow('The archive version is not supported');
});

async function fileRecord(filename: string, entryPath: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) {
    hash.update(chunk);
  }
  const stats = await stat(filename);
  return { path: entryPath, bytes: stats.size, sha256: hash.digest('hex') };
}
