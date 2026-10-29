import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createCaptureRuntime } from '../src/features/captures/runtime';
import { createFoundryArchive } from '../src/features/data-transfer/archive';
import {
  DATA_EXPORT_ARCHIVE_VERSION,
  DATA_EXPORT_SETTINGS_VERSION,
} from '../src/features/data-transfer/contracts';
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
import { writeSettings } from '../src/features/settings/repository';
import { providers } from '../src/storage/schema';
import {
  CURRENT_DATABASE_SCHEMA_VERSION,
  openFoundryDatabase,
} from '../src/storage/database';

const { join } = path;

it('rejects archives with invalid provider records during inspection', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-transfer-validation-'));
  const sourceDatabasePath = join(directory, 'source.sqlite');
  const sourceSettingsPath = join(directory, 'source-settings.json');
  const sourceDatabase = openFoundryDatabase(sourceDatabasePath);
  writeSettings(DEFAULT_SETTINGS, sourceSettingsPath);

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
    settings: {
      ...await fileRecord(sourceSettingsPath, SETTINGS_ENTRY_PATH),
      version: DATA_EXPORT_SETTINGS_VERSION,
    },
  };
  await writeFile(manifestPath, JSON.stringify(manifest));
  await createFoundryArchive([
    { entryPath: MANIFEST_ENTRY_PATH, filePath: manifestPath },
    { entryPath: DATABASE_ENTRY_PATH, filePath: sourceDatabasePath },
    { entryPath: SETTINGS_ENTRY_PATH, filePath: sourceSettingsPath },
  ], archivePath);
  await encryptExportFile(archivePath, backupPath, 'passphrase');

  const targetDatabase = openFoundryDatabase(join(directory, 'target.sqlite'));
  const targetSettingsPath = join(directory, 'target-settings.json');
  const transfer = new DataTransferService(
    targetDatabase,
    targetSettingsPath,
    createCaptureRuntime(targetDatabase, targetSettingsPath).runner,
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
