import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { createCaptureRuntime } from '../src/features/captures/runtime';
import { extractFoundryArchive } from '../src/features/data-transfer/archive';
import { decryptExportFile } from '../src/features/data-transfer/crypto';
import { DATA_ENTRY_PATH, MANIFEST_ENTRY_PATH } from '../src/features/data-transfer/format';
import { DataTransferService } from '../src/features/data-transfer/service';
import type { DataTransferStatus } from '../src/features/data-transfer/contracts';
import { WorkspaceMutationGate } from '../src/features/data-transfer/workspace-mutation';
import { ProviderRepository } from '../src/features/providers/repository';
import { readSettings, updateSettings } from '../src/features/settings/repository';
import { openFoundryStorage } from '../src/storage/index';

const { join } = path;

it('exports and restores an encrypted Foundry snapshot', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-transfer-'));
  const database = openFoundryStorage(directory);
  const providers = new ProviderRepository(database);
  const captureRuntime = createCaptureRuntime(database);
  const statusEvents: DataTransferStatus[] = [];
  const workspaceMutationGate = new WorkspaceMutationGate();
  const transfer = new DataTransferService(
    database,
    captureRuntime.runner,
    join(directory, '.data-transfer'),
    '0.0.0',
    workspaceMutationGate,
    (status) => {
      statusEvents.push(status);
    },
  );

  try {
    updateSettings({
      theme: 'dark',
      captures: { fetcher: 'firecrawl', firecrawlApiKey: 'capture-secret' },
    }, database);
    providers.save({
      name: 'Exported provider',
      protocol: 'openai-responses',
      baseURL: 'https://api.example.com/v1',
      apiKey: 'provider-secret',
      customModels: [],
    });

    transfer.cleanupStaleTransfers();
    const exported = await transfer.createExport('correct horse battery staple');
    expect(exported.providerCount).toBe(1);
    const decryptedPath = join(directory, 'backup.zip');
    const extractedPath = join(directory, 'extracted');
    await mkdir(extractedPath);
    await decryptExportFile(exported.filePath, decryptedPath, 'correct horse battery staple');
    const extracted = await extractFoundryArchive(decryptedPath, extractedPath);
    expect(Object.keys(extracted).toSorted((a, b) => a.localeCompare(b)))
      .toEqual([DATA_ENTRY_PATH, MANIFEST_ENTRY_PATH]);
    const manifest = JSON.parse(await readFile(extracted[MANIFEST_ENTRY_PATH], 'utf8')) as Record<string, unknown>;
    expect(manifest.archiveVersion).toBe(3);
    expect(manifest).not.toHaveProperty('settings');

    const configPath = join(directory, 'config.json');
    const configContent = JSON.stringify({ storage: { type: 'local' } });
    await writeFile(configPath, configContent);

    providers.setStatus(providers.list()[0].id, 'deleted');
    updateSettings({ theme: 'light' }, database);

    const preview = await transfer.inspectImport(
      exported.filePath,
      'correct horse battery staple',
    );
    expect(preview.providerCount).toBe(1);
    const failure = vi.spyOn(database, 'replace').mockImplementationOnce(() => {
      throw new Error('simulated import failure');
    });
    await expect(transfer.commitImport(preview.importId)).rejects.toThrow('simulated import failure');
    expect(readSettings(database).workspace.appearance['color-theme']).toBe('light');
    expect(providers.list()).toHaveLength(0);
    failure.mockRestore();
    await transfer.commitImport(preview.importId);

    expect(providers.list()).toHaveLength(1);
    expect(readSettings(database).workspace.appearance['color-theme']).toBe('dark');
    expect(readSettings(database).features.library.captures.firecrawl.apiKey).toBe('capture-secret');
    expect(await readFile(configPath, 'utf8')).toBe(configContent);
    expect(statusEvents[0]?.isBusy).toBe(true);
    expect(statusEvents.at(-1)?.isBusy).toBe(false);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
