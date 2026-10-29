import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createCaptureRuntime } from '../src/features/captures/runtime';
import { DataTransferService } from '../src/features/data-transfer/service';
import type { DataTransferStatus } from '../src/features/data-transfer/contracts';
import { WorkspaceMutationGate } from '../src/features/data-transfer/workspace-mutation';
import { ProviderRepository } from '../src/features/providers/repository';
import { readSettings, updateSettings } from '../src/features/settings/repository';
import { openFoundryDatabase } from '../src/storage/database';

const { join } = path;

it('exports and restores an encrypted Foundry snapshot', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-transfer-'));
  const settingsPath = join(directory, 'settings.json');
  const database = openFoundryDatabase(join(directory, 'foundry.sqlite'));
  const providers = new ProviderRepository(database.db);
  const captureRuntime = createCaptureRuntime(database, settingsPath);
  const statusEvents: DataTransferStatus[] = [];
  const workspaceMutationGate = new WorkspaceMutationGate();
  const transfer = new DataTransferService(
    database,
    settingsPath,
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
      captures: { fetcher: 'deepseek', deepseekApiKey: 'capture-secret' },
    }, settingsPath);
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

    providers.setStatus(providers.list()[0].id, 'deleted');
    updateSettings({ theme: 'light' }, settingsPath);

    const preview = await transfer.inspectImport(
      exported.filePath,
      'correct horse battery staple',
    );
    expect(preview.providerCount).toBe(1);
    await transfer.commitImport(preview.importId);

    expect(providers.list()).toHaveLength(1);
    expect(readSettings(settingsPath).workspace.appearance['color-theme']).toBe('dark');
    expect(statusEvents[0]?.isBusy).toBe(true);
    expect(statusEvents.at(-1)?.isBusy).toBe(false);
  } finally {
    database.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
