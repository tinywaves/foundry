import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createCaptureRuntime } from '../src/features/captures/runtime';
import { createFoundryArchive } from '../src/features/data-transfer/archive';
import { DATA_EXPORT_ARCHIVE_VERSION } from '../src/features/data-transfer/contracts';
import { encryptExportFile } from '../src/features/data-transfer/crypto';
import {
  DATABASE_ENTRY_PATH,
  DATA_EXPORT_FORMAT,
  MANIFEST_ENTRY_PATH,
  SETTINGS_ENTRY_PATH,
} from '../src/features/data-transfer/format';
import { DataTransferService } from '../src/features/data-transfer/service';
import { WorkspaceMutationGate } from '../src/features/data-transfer/workspace-mutation';
import { DEFAULT_SETTINGS } from '../src/features/settings/contracts';
import { readStoredSettings, writeSettings } from '../src/features/settings/repository';
import { providers } from '../src/storage/schema';
import {
  CURRENT_DATABASE_SCHEMA_VERSION,
  openFoundryDatabase,
} from '../src/storage/database';
import { createPreviousDatabase } from './helpers/previous-database';

const { join } = path;

it('rejects archives with invalid provider records during inspection', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-transfer-validation-'));
  const sourceDatabasePath = join(directory, 'source.sqlite');
  const sourceDatabase = openFoundryDatabase(sourceDatabasePath);
  writeSettings(DEFAULT_SETTINGS, sourceDatabase.db);

  const timestamp = new Date();
  sourceDatabase.db.insert(providers).values({
    id: randomUUID(),
    name: 'Broken provider',
    protocol: 'openai-responses',
    baseURL: 'https://api.example.com/v1',
    apiKey: 'secret',
    customModels: '[{}]',
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  }).run();
  sourceDatabase.client.close();

  const workDirectory = join(directory, 'archive-work');
  await mkdir(workDirectory);
  const manifestPath = join(workDirectory, MANIFEST_ENTRY_PATH);
  const archivePath = join(workDirectory, 'archive.zip');
  const backupPath = join(directory, 'invalid.foundry-backup');
  const manifest = {
    format: DATA_EXPORT_FORMAT,
    archiveVersion: DATA_EXPORT_ARCHIVE_VERSION,
    appVersion: '0.0.0',
    createdAt: new Date().toISOString(),
    database: {
      ...await fileRecord(sourceDatabasePath, DATABASE_ENTRY_PATH),
      schemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
    },
  };
  await writeFile(manifestPath, JSON.stringify(manifest));
  await createFoundryArchive([
    { entryPath: MANIFEST_ENTRY_PATH, filePath: manifestPath },
    { entryPath: DATABASE_ENTRY_PATH, filePath: sourceDatabasePath },
  ], archivePath);
  await encryptExportFile(archivePath, backupPath, 'passphrase');

  const targetDatabase = openFoundryDatabase(join(directory, 'target.sqlite'));
  const transfer = new DataTransferService(
    targetDatabase,
    createCaptureRuntime(targetDatabase).runner,
    join(directory, '.data-transfer'),
    '0.0.0',
    new WorkspaceMutationGate(),
  );

  try {
    transfer.cleanupStaleTransfers();
    let inspectionError: unknown;
    try {
      await transfer.inspectImport(backupPath, 'passphrase');
    } catch (error) {
      inspectionError = error;
    }
    expect(inspectionError).toMatchObject({
      code: 'INVALID_ARCHIVE',
      message: 'A provider record is invalid',
    });
  } finally {
    targetDatabase.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('imports version 1 archives and moves their settings into the database', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-transfer-legacy-'));
  const sourcePath = join(directory, 'source.sqlite');
  const source = createPreviousDatabase(sourcePath, 3);
  source.close();
  const settingsPath = join(directory, 'legacy-settings.json');
  const legacy = structuredClone(DEFAULT_SETTINGS);
  legacy.workspace.appearance['color-theme'] = 'dark';
  legacy.features.library.captures.firecrawl.apiKey = 'legacy-archive-key';
  await writeFile(settingsPath, JSON.stringify(legacy));
  const manifestPath = join(directory, MANIFEST_ENTRY_PATH);
  await writeFile(manifestPath, JSON.stringify({
    format: DATA_EXPORT_FORMAT,
    archiveVersion: 1,
    appVersion: '0.0.0',
    createdAt: new Date().toISOString(),
    database: { ...await fileRecord(sourcePath, DATABASE_ENTRY_PATH), schemaVersion: 3 },
    settings: { ...await fileRecord(settingsPath, SETTINGS_ENTRY_PATH), version: 1 },
  }));
  const zipPath = join(directory, 'legacy.zip');
  const backupPath = join(directory, 'legacy.foundry-backup');
  await createFoundryArchive([
    { entryPath: MANIFEST_ENTRY_PATH, filePath: manifestPath },
    { entryPath: DATABASE_ENTRY_PATH, filePath: sourcePath },
    { entryPath: SETTINGS_ENTRY_PATH, filePath: settingsPath },
  ], zipPath);
  await encryptExportFile(zipPath, backupPath, 'passphrase');

  const target = openFoundryDatabase(join(directory, 'target.sqlite'));
  const transfer = new DataTransferService(
    target,
    createCaptureRuntime(target).runner,
    join(directory, '.data-transfer'),
    '0.0.0',
    new WorkspaceMutationGate(),
  );
  try {
    const preview = await transfer.inspectImport(backupPath, 'passphrase');
    expect(preview.databaseSchemaVersion).toBe(3);
    expect(readStoredSettings(target.db).workspace.appearance['color-theme']).toBe('system');
    await transfer.commitImport(preview.importId);
    expect(readStoredSettings(target.db)).toEqual(legacy);
  } finally {
    target.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});

async function fileRecord(filePath: string, entryPath: string) {
  const fileStats = await stat(filePath);
  return {
    path: entryPath,
    bytes: fileStats.size,
    sha256: await sha256File(filePath),
  };
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}
