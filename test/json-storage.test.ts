import type { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { expect, it } from 'vitest';
import { CaptureRepository } from '../src/features/captures/repository';
import { ProviderRepository } from '../src/features/providers/repository';
import { createApiApp } from '../src/server/api';
import { updateSettings } from '../src/features/settings/repository';
import { openFoundryStorage } from '../src/storage/index';

it('starts with default JSON data without importing old files', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-json-defaults-'));
  try {
    const sqlitePath = path.join(directory, 'foundry.sqlite');
    await writeFile(sqlitePath, 'old SQLite data is not opened');
    const storage = openFoundryStorage(directory);
    expect(storage.readSettings().workspace.appearance['color-theme']).toBe('system');
    expect(storage.all('providers')).toEqual([]);
    expect(storage.all('captures')).toEqual([]);
    expect(storage.all('fetchJobs')).toEqual([]);
    expect(existsSync(path.join(directory, 'manifest.json'))).toBe(false);
    expect(await readFile(sqlitePath, 'utf8')).toBe('old SQLite data is not opened');
    storage.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('reads external file changes on the next request without reopening storage', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-json-direct-'));
  const storage = openFoundryStorage(directory);
  try {
    const app = createApiApp(storage);
    const initialResponse = await app.request('/api/settings');
    expect(await initialResponse.json()).toMatchObject({ workspace: { appearance: { 'color-theme': 'system' } } });
    const settings = storage.readSettings();
    settings.workspace.appearance['color-theme'] = 'dark';
    await writeFile(path.join(directory, 'settings.json'), JSON.stringify(settings));
    const updatedResponse = await app.request('/api/settings');
    expect(await updatedResponse.json()).toMatchObject({ workspace: { appearance: { 'color-theme': 'dark' } } });

    const providers = new ProviderRepository(storage);
    const saved = providers.save({ name: 'Before', protocol: 'openai-responses', baseURL: 'https://example.test/v1', apiKey: '', customModels: [] });
    const filenames = await readdir(path.join(directory, 'providers'));
    const filename = path.join(directory, 'providers', filenames[0]);
    await writeFile(filename, JSON.stringify({ ...saved, name: 'After' }));
    expect(providers.get(saved.id)?.name).toBe('After');
    expect(providers.list()[0].name).toBe('After');
    await rm(filename);
    expect(providers.get(saved.id)).toBeNull();
    expect(providers.list()).toEqual([]);
    expect(existsSync(path.join(directory, 'manifest.json'))).toBe(false);
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('keeps separate handles consistent and rolls back a failed transaction', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-json-handles-'));
  const storage = openFoundryStorage(directory);
  const other = openFoundryStorage(storage.path);
  try {
    updateSettings({ theme: 'dark' }, storage);
    updateSettings({ language: 'zh-CN' }, other);
    expect(storage.readSettings().workspace).toMatchObject({ 'appearance': { 'color-theme': 'dark' }, 'language-region': { language: 'zh-CN' } });
    expect(() => storage.transaction(() => {
      storage.setSettings({ ...storage.readSettings(), features: { library: { captures: { fetcher: null, fetchConcurrency: 9, maxAttempts: 2, firecrawl: { apiKey: '' } } } } });
      throw new Error('abort');
    })).toThrow('abort');
    expect(other.readSettings().features.library.captures.fetchConcurrency).toBe(2);
    expect(existsSync(path.join(directory, 'foundry.sqlite'))).toBe(false);
    const files = JSON.parse(await readFile(path.join(storage.path, 'settings.json'), 'utf8')) as unknown;
    expect(files).toEqual(storage.readSettings());
  } finally {
    storage.close();
    other.close();
    await rm(directory, { recursive: true, force: true });
  }
});
it.each([false, true])('recovers a dead-process lock (interrupted recovery: %s)', async (interruptedRecovery) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-json-lock-'));
  const storePath = directory;
  const initial = openFoundryStorage(storePath);
  initial.close();
  try {
    await mkdir(path.join(storePath, '.lock'));
    await writeFile(path.join(storePath, '.lock', 'owner.json'), JSON.stringify({ pid: 2_147_483_647 }));
    if (interruptedRecovery) {
      const recoveryPath = path.join(storePath, '.lock', 'recovering');
      await mkdir(recoveryPath);
      await writeFile(path.join(recoveryPath, 'owner.json'), JSON.stringify({ pid: 2_147_483_647 }));
    }
    const reopened = openFoundryStorage(storePath);
    updateSettings({ theme: 'dark' }, reopened);
    expect(reopened.readSettings().workspace.appearance['color-theme']).toBe('dark');
    expect(existsSync(path.join(storePath, '.lock'))).toBe(false);
    reopened.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
it('completes an interrupted committed file transaction before reads', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-json-recovery-'));
  const storage = openFoundryStorage(directory);
  const settings = storage.readSettings();
  settings.workspace.appearance['color-theme'] = 'dark';
  storage.close();
  try {
    await writeFile(path.join(directory, '.transaction.json'), JSON.stringify({ changes: [{ file: 'settings.json', value: settings }] }));
    const reopened = openFoundryStorage(directory);
    expect(reopened.readSettings().workspace.appearance['color-theme']).toBe('dark');
    expect(existsSync(path.join(reopened.path, '.transaction.json'))).toBe(false);
    reopened.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
it('serializes competing processes and preserves active URL/job uniqueness', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-json-processes-'));
  const storePath = directory;
  const initial = openFoundryStorage(storePath);
  initial.close();
  const script = `
    import { openFoundryStorage } from './src/storage/index.ts';
    import { CaptureRepository } from './src/features/captures/repository.ts';
    const storage = openFoundryStorage(process.argv[1]);
    const repository = new CaptureRepository(storage);
    process.stdout.write('ready\\n');
    process.stdin.once('data', () => {
      try { repository.createWithJob('https://example.test/same', null, { fetcher: 'firecrawl', apiKey: 'test-key', maxAttempts: 1 }); process.stdout.write('created\\n'); }
      catch (error) { process.stdout.write(error.code + '\\n'); }
      finally { storage.close(); process.stdin.pause(); }
    });
  `;
  const children = Array.from({ length: 3 }, () => spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script, storePath], { stdio: ['pipe', 'pipe', 'pipe'] }));
  const output = children.map(() => '');
  try {
    await Promise.all(children.map((child, i) => new Promise<void>((resolve, reject) => {
      child.stdout.on('data', (data: Buffer) => {
        output[i] += data.toString();
        if (output[i].includes('ready')) {
          resolve();
        }
      });
      child.once('error', reject);
      child.once('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`worker exited ${code}`));
        }
      });
    })));
    const exits = children.map((child) => once(child, 'exit'));
    for (const child of children) {
      child.stdin.end('go');
    }
    expect(await Promise.all(exits)).toEqual([[0, null], [0, null], [0, null]]);
    expect(output.filter((value) => value.includes('created'))).toHaveLength(1);
    expect(output.filter((value) => value.includes('CAPTURE_ALREADY_EXISTS'))).toHaveLength(2);
    const reopened = openFoundryStorage(storePath);
    const repository = new CaptureRepository(reopened);
    expect(repository.counts()).toEqual({ all: 1, noSuccessful: 1 });
    expect(reopened.all('fetchJobs')).toHaveLength(1);
    expect(() => repository.createJob(repository.list('all')[0].id, { fetcher: 'firecrawl', apiKey: 'test-key', maxAttempts: 1 })).toThrow('active fetch job');
    reopened.close();
  } finally {
    for (const child of children) {
      if (child.exitCode === null) {
        child.kill();
      }
    }
    await rm(directory, { recursive: true, force: true });
  }
});
