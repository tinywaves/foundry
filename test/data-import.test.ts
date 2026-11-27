import { Buffer } from 'node:buffer';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import * as filePromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DATA_BACKUP_ENTRY, DATA_BACKUP_FORMAT, DATA_BACKUP_VERSION } from '@dhzh/foundry-shared';
import { expect, it, vi } from 'vitest';

import { createFoundryArchive } from '../src/lib/backup/archive';
import { encryptExportFile } from '../src/lib/backup/crypto';
import { DataImportService } from '../src/features/data-import/service';
import { normalizeSettings } from '../src/features/settings/contracts';
import { updateSettings } from '../src/features/settings/repository';
import { createApiApp } from '../src/server/api';
import { openFoundryStorage } from '../src/storage/index';
import * as storageFiles from '../src/storage/files';

const backupPassphrase = 'correct-password';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, rm: vi.fn(actual.rm) };
});

it('imports in one request, fully replaces current data, and preserves data on a failed write', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-roundtrip-'));
  const source = openFoundryStorage(path.join(directory, 'source'));
  const target = openFoundryStorage(path.join(directory, 'target'));
  try {
    updateSettings({ theme: 'dark', language: 'zh-CN', timezone: 'UTC', timeFormat: 'HH:mm:ss' }, source);
    const expected = source.readSettings();
    const exported = await createApiApp(source).request('/api/data-export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase: backupPassphrase }),
    });
    expect(exported.status).toBe(200);
    const archive = Buffer.from(await exported.arrayBuffer());
    const current = target.readSettings();
    current.features.onlyInCurrent = { value: 'must be removed' };
    target.transaction(() => target.setSettings(current));
    const changed = vi.fn();
    const app = createApiApp(target, { onSettingsChanged: changed });
    const request = () => app.request('/api/data-import', {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream', 'x-foundry-passphrase': encodeURIComponent(backupPassphrase) },
      body: archive,
    });
    const failingWrite = vi.spyOn(target, 'setSettings').mockImplementationOnce(() => {
      throw new Error('simulated disk error');
    });
    const failed = await request();
    expect(failed.status).toBe(500);
    expect(await failed.json()).toMatchObject({ error: { code: 'IMPORT_FAILED' } });
    expect(target.readSettings()).toEqual(current);
    expect(changed).not.toHaveBeenCalled();
    failingWrite.mockRestore();
    const imported = await request();
    expect(imported.status).toBe(200);
    expect(await imported.json()).toEqual({ status: 'imported' });
    expect(target.readSettings()).toEqual(expected);
    expect(changed).toHaveBeenCalledTimes(1);
    const reopened = openFoundryStorage(target.path);
    expect(reopened.readSettings()).toEqual(expected);
    reopened.close();
    await expectStatus(app.request('/api/data-import/inspect', { method: 'POST' }), 404);
    await expectStatus(app.request('/api/data-import/unused/commit', { method: 'POST' }), 404);
  } finally {
    source.close();
    target.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('lets independent tabs import backups and keeps the last successful import', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-last-write-'));
  const storage = openFoundryStorage(path.join(directory, 'storage'));
  try {
    const firstSettings = normalizeSettings({ workspace: { appearance: { 'color-theme': 'dark' } } });
    const secondSettings = normalizeSettings({ workspace: { appearance: { 'color-theme': 'light' } } });
    const firstBackup = await makeBackup(directory, { settings: firstSettings });
    const secondBackup = await makeBackup(directory, { settings: secondSettings });
    const app = createApiApp(storage);
    await expectStatus(importRequest(app, firstBackup), 200);
    await expectStatus(importRequest(app, secondBackup), 200);
    const stored = await readFile(path.join(storage.path, 'settings.json'), 'utf8');
    expect(JSON.parse(stored)).toEqual(secondSettings);
    // An older tab can still submit its file; only actual write order matters.
    await expectStatus(importRequest(app, firstBackup), 200);
    const latest = await readFile(path.join(storage.path, 'settings.json'), 'utf8');
    expect(JSON.parse(latest)).toEqual(firstSettings);
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('accepts simultaneous independent imports and applies each replacement atomically', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-concurrent-'));
  const storage = openFoundryStorage(path.join(directory, 'storage'));
  try {
    const first = normalizeSettings({ workspace: { appearance: { 'color-theme': 'dark' } } });
    const second = normalizeSettings({ workspace: { appearance: { 'color-theme': 'light' } } });
    const firstBackup = await makeBackup(directory, { settings: first });
    const secondBackup = await makeBackup(directory, { settings: second });
    const app = createApiApp(storage);
    const results = await Promise.all([importRequest(app, firstBackup), importRequest(app, secondBackup)]);
    expect(results.map((response) => response.status)).toEqual([200, 200]);
    expect([first, second]).toContainEqual(storage.readSettings());
    await expectStatus(importRequest(app, secondBackup), 200);
    expect(storage.readSettings()).toEqual(second);
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('does not report a committed import as failed when a change listener throws', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-notification-'));
  const storage = openFoundryStorage(path.join(directory, 'storage'));
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const settings = normalizeSettings({ workspace: { appearance: { 'color-theme': 'dark' } } });
    const backup = await makeBackup(directory, { settings });
    const app = createApiApp(storage, { onSettingsChanged: () => {
      throw new Error('listener failed');
    } });
    await expectStatus(importRequest(app, backup), 200);
    expect(storage.readSettings()).toEqual(settings);
    expect(log).toHaveBeenCalledOnce();
  } finally {
    log.mockRestore();
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('reports unreadable backup files as import failures rather than password errors', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-file-error-'));
  const storage = openFoundryStorage(path.join(directory, 'storage'));
  try {
    const previous = storage.readSettings();
    await expect(new DataImportService(storage).importData(path.join(directory, 'missing.foundry-backup'), backupPassphrase))
      .rejects
      .toMatchObject({ code: 'IMPORT_FAILED' });
    expect(storage.readSettings()).toEqual(previous);
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('returns success after recovering an already committed import journal', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-recover-'));
  const storage = openFoundryStorage(path.join(directory, 'storage'));
  const originalWrite = storageFiles.writeJsonAtomic;
  try {
    const settings = normalizeSettings({ workspace: { appearance: { 'color-theme': 'dark' } } });
    const backup = await makeBackup(directory, { settings });
    let hasFailedWrite = false;
    const failingWrite = vi.spyOn(storageFiles, 'writeJsonAtomic').mockImplementation((file, value) => {
      if (!hasFailedWrite && file === path.join(storage.path, 'settings.json')) {
        hasFailedWrite = true;
        throw new Error('recoverable write error after journal commit');
      }
      originalWrite(file, value);
    });
    try {
      await expectStatus(importRequest(createApiApp(storage), backup), 200);
      expect(hasFailedWrite).toBe(true);
      expect(storage.readSettings()).toEqual(settings);
    } finally {
      failingWrite.mockRestore();
    }
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('does not report a successful import as failed if temporary upload cleanup fails', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-cleanup-'));
  const storage = openFoundryStorage(path.join(directory, 'storage'));
  const actualFiles = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  const originalRemove = actualFiles.rm;
  const retained: string[] = [];
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const settings = normalizeSettings({ workspace: { appearance: { 'color-theme': 'dark' } } });
    const backup = await makeBackup(directory, { settings });
    const failingCleanup = vi.spyOn(filePromises, 'rm').mockImplementation(async (target, options) => {
      if (typeof target === 'string' && path.basename(target).startsWith('foundry-import-upload-')) {
        retained.push(target);
        throw new Error('temporary cleanup failure');
      }
      await originalRemove(target, options);
    });
    try {
      await expectStatus(importRequest(createApiApp(storage), backup), 200);
      expect(storage.readSettings()).toEqual(settings);
      expect(retained).toHaveLength(1);
      expect(log).toHaveBeenCalledWith('Unable to remove backup temporary files');
    } finally {
      failingCleanup.mockRestore();
    }
  } finally {
    log.mockRestore();
    for (const target of retained) {
      await originalRemove(target, { recursive: true, force: true });
    }
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('normalizes partial or invalid backup settings before replacing current data', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-basic-'));
  const storage = openFoundryStorage(path.join(directory, 'storage'));
  try {
    const app = createApiApp(storage);
    for (const settings of [{}, { workspace: { appearance: { 'color-theme': 'unknown' } }, arbitrary: true }]) {
      const archive = await makeBackup(directory, { settings, futureField: [] }, { appVersion: null, createdAt: null });
      await expectStatus(importRequest(app, archive), 200);
      const stored = await readFile(path.join(storage.path, 'settings.json'), 'utf8');
      expect(JSON.parse(stored)).toEqual(normalizeSettings(settings));
      expect(storage.readSettings().workspace.appearance['color-theme']).toBe('system');
    }
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('has no upload or expanded archive size cap', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-large-'));
  const storage = openFoundryStorage(path.join(directory, 'storage'));
  try {
    const settings = { features: { large: 'x'.repeat(17 * 1024 * 1024) } };
    const archive = await makeBackup(directory, { settings }, { padding: 'y'.repeat(2 * 1024 * 1024) });
    const largeUpload = await makeBackup(directory, { settings: { features: { large: randomBytes(18 * 1024 * 1024).toString('base64') } } });
    expect(largeUpload.byteLength).toBeGreaterThan(16 * 1024 * 1024);
    await expectStatus(importRequest(createApiApp(storage), largeUpload), 200);
    await expectStatus(importRequest(createApiApp(storage), archive), 200);
    const stored = await readFile(path.join(storage.path, 'settings.json'), 'utf8');
    expect(JSON.parse(stored)).toEqual(normalizeSettings(settings));
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('rejects unreadable or corrupted backups using basic checks without changing current data', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-import-invalid-'));
  const storage = openFoundryStorage(path.join(directory, 'storage'));
  try {
    const app = createApiApp(storage);
    const previous = storage.readSettings();
    const good = await makeBackup(directory, { settings: previous });
    const wrong = await importRequest(app, good, 'wrong-password');
    expect(wrong.status).toBe(400);
    expect(await wrong.json()).toMatchObject({ error: { code: 'INVALID_PASSPHRASE' } });
    const tampered = Buffer.from(good);
    tampered[tampered.length - 1] ^= 1;
    const cases = [
      tampered,
      await makeBackup(directory, { settings: previous }, { archiveVersion: DATA_BACKUP_VERSION + 1 }),
      await makeBackup(directory, { settings: previous }, { format: 'foundry.snapshot' }),
      await makeBackup(directory, { settings: previous }, { data: { path: DATA_BACKUP_ENTRY, bytes: 1, sha256: 'a'.repeat(64) } }),
      await makeBackup(directory, {}),
      await makeBackup(directory, { settings: [] }),
      await makeBackup(directory, { settings: previous }, {}, true),
      Buffer.from('invalid data'),
    ];
    for (const archive of cases) {
      await expectStatus(importRequest(app, archive), 400);
      expect(storage.readSettings()).toEqual(previous);
    }
    await expectStatus(importRequest(app, good, ''), 400);
    await expectStatus(importRequest(app, good, backupPassphrase, { 'x-foundry-passphrase': '%broken' }), 400);
    await expectStatus(importRequest(app, good, backupPassphrase, { 'content-type': 'text/plain' }), 400);
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

function importRequest(app: ReturnType<typeof createApiApp>, body: Buffer, passphrase = backupPassphrase, headers = {}) {
  return app.request('/api/data-import', {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream', 'x-foundry-passphrase': encodeURIComponent(passphrase), ...headers },
    body,
  });
}

async function makeBackup(directory: string, data: unknown, manifestPatch: Record<string, unknown> = {}, hasUnexpectedEntry = false): Promise<Buffer> {
  const bytes = JSON.stringify(data);
  const dataPath = path.join(directory, 'data.json');
  const manifestPath = path.join(directory, 'manifest.json');
  const archivePath = path.join(directory, 'archive.zip');
  const encryptedPath = path.join(directory, 'archive.foundry-backup');
  await writeFile(dataPath, bytes);
  await writeFile(manifestPath, JSON.stringify({
    format: DATA_BACKUP_FORMAT,
    archiveVersion: DATA_BACKUP_VERSION,
    appVersion: '6.3.2',
    createdAt: new Date().toISOString(),
    data: { path: DATA_BACKUP_ENTRY, bytes: Buffer.byteLength(bytes), sha256: createHash('sha256').update(bytes).digest('hex') },
    ...manifestPatch,
  }));
  const files = [{ entryPath: 'manifest.json', filePath: manifestPath }, { entryPath: DATA_BACKUP_ENTRY, filePath: dataPath }];
  if (hasUnexpectedEntry) {
    files.push({ entryPath: 'unexpected.json', filePath: dataPath });
  }
  await createFoundryArchive(files, archivePath);
  await encryptExportFile(archivePath, encryptedPath, backupPassphrase);
  return readFile(encryptedPath);
}

async function expectStatus(response: Response | Promise<Response>, status: number) {
  const result = await response;
  expect(result.status).toBe(status);
}
