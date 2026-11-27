import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import yauzl from 'yauzl';

import { decryptExportFile } from '../src/lib/backup/crypto';
import { AgentsService } from '../src/features/agents/service';
import { InstructionsService } from '../src/features/instructions/service';
import { ProviderRepository } from '../src/features/providers/repository';
import { DATA_BACKUP_ENTRY, DATA_BACKUP_FORMAT, DATA_BACKUP_VERSION } from '@dhzh/foundry-shared';
import { normalizeSettings } from '../src/features/settings/contracts';
import { updateSettings } from '../src/features/settings/repository';
import { createApiApp } from '../src/server/api';
import { openFoundryStorage } from '../src/storage/index';

it('downloads an authenticated encrypted backup of the data implemented in the current app', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-data-export-test-'));
  const storage = openFoundryStorage(path.join(directory, 'storage'));
  try {
    updateSettings({ theme: 'dark', language: 'zh-CN', captures: { firecrawlApiKey: 'settings-secret' } }, storage);
    new ProviderRepository(storage).save({
      name: 'Excluded provider',
      protocol: 'openai-responses',
      baseURL: 'https://api.example.com/v1',
      apiKey: 'excluded-provider-secret',
      customModels: [],
    });
    const instructions = new InstructionsService(storage);
    const instruction = instructions.create({
      name: 'Exported instruction',
      content: '# Exported\n\nInclude this Markdown in the backup.',
    });
    new AgentsService(
      storage,
      instructions,
      path.join(directory, 'home'),
    ).updateInstructions('chatgpt', [instruction.id]);
    const expectedSettings = storage.readSettings();
    const expectedInstructions = instructions.list();
    const expectedAgents = storage.all('agents');
    const app = createApiApp(storage);
    const response = await app.request('/api/data-export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase: ' 密码 with spaces ' }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="foundry-.+\.foundry-backup"$/u);
    const encrypted = Buffer.from(await response.arrayBuffer());
    expect(encrypted.subarray(0, 8).toString()).toBe('FOUNDRYX');
    expect(encrypted.includes(Buffer.from('settings-secret'))).toBe(false);
    expect(encrypted.includes(Buffer.from('Include this Markdown'))).toBe(false);

    const backupPath = path.join(directory, 'settings.foundry-backup');
    const zipPath = path.join(directory, 'settings.zip');
    await writeFile(backupPath, encrypted);
    await expect(decryptExportFile(backupPath, zipPath, 'wrong password')).rejects.toMatchObject({ code: 'INVALID_PASSPHRASE' });
    await decryptExportFile(backupPath, zipPath, ' 密码 with spaces ');
    const files = await readZip(await readFile(zipPath));
    expect(Object.keys(files).toSorted((a, b) => a.localeCompare(b))).toEqual([DATA_BACKUP_ENTRY, 'manifest.json']);
    const dataFile = files[DATA_BACKUP_ENTRY];
    expect(JSON.parse(dataFile.toString('utf8'))).toEqual({
      settings: expectedSettings,
      instructions: expectedInstructions,
      agents: expectedAgents,
    });
    expect(dataFile.includes(Buffer.from('excluded-provider-secret'))).toBe(false);
    expect(dataFile.toString()).toContain('Include this Markdown in the backup.');
    expect(dataFile.toString()).not.toContain('configFolder');
    expect(JSON.parse(files['manifest.json'].toString('utf8'))).toMatchObject({
      format: DATA_BACKUP_FORMAT,
      archiveVersion: DATA_BACKUP_VERSION,
      appVersion: expect.any(String),
      createdAt: expect.any(String),
      data: {
        path: DATA_BACKUP_ENTRY,
        bytes: dataFile.byteLength,
        sha256: createHash('sha256').update(dataFile).digest('hex'),
      },
    });
    expect(storage.readSettings()).toEqual(expectedSettings);
    expect(instructions.list()).toEqual(expectedInstructions);
    expect(storage.all('agents')).toEqual(expectedAgents);
    expect(new ProviderRepository(storage).list()).toHaveLength(1);
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('rejects missing export passwords and returns deliberate JSON errors on export failure', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-data-export-input-'));
  const storage = openFoundryStorage(directory);
  const app = createApiApp(storage);
  try {
    for (const body of ['not json', '{}', '{"passphrase":""}', '{"passphrase":123}']) {
      const response = await app.request('/api/data-export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: 'INVALID_EXPORT_INPUT' } });
    }
    vi.spyOn(storage, 'readSettings').mockImplementationOnce(() => {
      throw new Error('Internal filesystem error containing private paths');
    });
    const failed = await app.request('/api/data-export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase: 'backup password' }),
    });
    expect(failed.status).toBe(500);
    expect(await failed.json()).toEqual({ error: { code: 'DATA_EXPORT_FAILED', message: 'Unable to export data' } });
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

function readZip(bytes: Buffer): Promise<Record<string, Buffer>> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(bytes, { lazyEntries: true }, (error, zip) => {
      if (error) {
        reject(error);
        return;
      }
      const files: Record<string, Buffer> = {};
      zip.on('error', reject);
      zip.on('end', () => resolve(files));
      zip.on('entry', (entry) => {
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) {
            reject(streamError);
            return;
          }
          const chunks: Buffer[] = [];
          stream.on('error', reject);
          stream.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          stream.on('end', () => {
            files[entry.fileName] = Buffer.concat(chunks);
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}

it('exports settings according to the same normalization rules as import and runtime reads', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-export-normalized-'));
  const storage = openFoundryStorage(path.join(directory, 'storage'));
  const settings = { workspace: { appearance: { 'color-theme': 'custom' } }, customSetting: { retained: true } };
  try {
    await writeFile(path.join(storage.path, 'settings.json'), JSON.stringify(settings));
    expect(storage.readSettings().workspace.appearance['color-theme']).toBe('system');
    const response = await createApiApp(storage).request('/api/data-export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase: 'roundtrip password' }),
    });
    expect(response.status).toBe(200);
    const backupPath = path.join(directory, 'backup.foundry-backup');
    const zipPath = path.join(directory, 'backup.zip');
    await writeFile(backupPath, Buffer.from(await response.arrayBuffer()));
    await decryptExportFile(backupPath, zipPath, 'roundtrip password');
    const files = await readZip(await readFile(zipPath));
    expect(JSON.parse(files[DATA_BACKUP_ENTRY].toString('utf8'))).toEqual({
      settings: normalizeSettings(settings),
      instructions: [],
      agents: [],
    });
    expect(storage.readSettings()).toEqual(normalizeSettings(settings));
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});
