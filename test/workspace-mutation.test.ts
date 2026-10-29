import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createCaptureRuntime } from '../src/features/captures/runtime';
import { DataTransferService } from '../src/features/data-transfer/service';
import { WorkspaceMutationGate } from '../src/features/data-transfer/workspace-mutation';
import { createApiApp } from '../src/server/api';
import { openFoundryDatabase } from '../src/storage/database';

const { join } = path;

it('blocks workspace mutations while data transfer owns the workspace', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-workspace-mutation-'));
  const settingsPath = join(directory, 'settings.json');
  const database = openFoundryDatabase(join(directory, 'foundry.sqlite'));
  const captureRuntime = createCaptureRuntime(database, settingsPath);
  const workspaceMutationGate = new WorkspaceMutationGate();
  const transfer = new DataTransferService(
    database,
    settingsPath,
    captureRuntime.runner,
    join(directory, '.data-transfer'),
    '0.0.0',
    workspaceMutationGate,
  );
  const app = createApiApp(database, {
    settingsPath,
    captureService: captureRuntime.service,
    dataTransferService: transfer,
    workspaceMutationGate,
  });

  const exporting = transfer.createExport('correct horse battery staple');
  expect(workspaceMutationGate.isTransferActive).toBe(true);

  try {
    const captureResponse = await app.request('/api/captures', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    expect(captureResponse.status).toBe(409);
    expect(await captureResponse.json()).toEqual({
      error: {
        code: 'DATA_TRANSFER_BUSY',
        message: 'Another data transfer is in progress',
      },
    });

    const settingsResponse = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme: 'dark' }),
    });
    expect(settingsResponse.status).toBe(409);

    const providerResponse = await app.request('/api/providers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Blocked provider',
        protocol: 'openai-responses',
        baseURL: 'https://api.example.com/v1',
        apiKey: 'secret',
        customModels: [],
      }),
    });
    expect(providerResponse.status).toBe(409);

    const secondExportResponse = await app.request('/api/data-transfer/export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase: 'another passphrase' }),
    });
    expect(secondExportResponse.status).toBe(409);
    expect(await secondExportResponse.json()).toEqual({
      error: {
        code: 'BUSY',
        message: 'Another data transfer is in progress',
      },
    });

    const healthResponse = await app.request('/api/health');
    expect(healthResponse.status).toBe(200);
    const missingResponse = await app.request('/api/missing', { method: 'POST' });
    expect(missingResponse.status).toBe(404);

    await exporting;
    expect(workspaceMutationGate.isTransferActive).toBe(false);
    const allowedSettingsResponse = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme: 'dark' }),
    });
    expect(allowedSettingsResponse.status).toBe(200);
  } finally {
    try {
      await exporting;
    } catch {
      // Preserve the original assertion failure if export failed.
    }
    database.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
