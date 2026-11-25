import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { FoundryEventHub } from '../src/events/hub';
import { SETTINGS_CHANGED_EVENT } from '../src/features/settings/events';
import { readStoredSettings } from '../src/features/settings/repository';
import { createApiApp } from '../src/server/api';
import { openFoundryStorage } from '../src/storage/index';

const { join } = path;

it('persists settings and exposes capture API keys', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-settings-'));
  const database = openFoundryStorage(directory);

  try {
    const eventHub = new FoundryEventHub();
    const events: Array<{ type: string; data: unknown }> = [];
    eventHub.subscribe((event) => {
      events.push(event);
    });
    const app = createApiApp(database, { eventHub });

    const initialResponse = await app.request('/api/settings');
    expect(initialResponse.status).toBe(200);
    const initial = await initialResponse.json() as {
      workspace: { appearance: { 'color-theme': string } };
      features: {
        library: {
          captures: { firecrawl: { apiKey: string } };
        };
      };
    };
    expect(initial.workspace.appearance['color-theme']).toBe('system');
    expect(initial.features.library.captures.firecrawl.apiKey).toBe('');

    const updateResponse = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        theme: 'dark',
        captures: {
          fetcher: 'firecrawl',
          firecrawlApiKey: 'secret',
        },
      }),
    });
    expect(updateResponse.status).toBe(200);
    const updated = await updateResponse.json() as {
      workspace: { appearance: { 'color-theme': string } };
      features: {
        library: {
          captures: {
            firecrawl: { apiKey: string };
          };
        };
      };
    };
    expect(updated.workspace.appearance['color-theme']).toBe('dark');
    expect(updated.features.library.captures.firecrawl).toEqual({ apiKey: 'secret' });
    const settingsFile = await readFile(join(database.path, 'settings.json'), 'utf8');
    expect(JSON.parse(settingsFile)).toMatchObject({
      workspace: { appearance: { 'color-theme': 'dark' } },
      features: { library: { captures: { firecrawl: { apiKey: 'secret' } } } },
    });
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: SETTINGS_CHANGED_EVENT,
        data: { fields: ['theme', 'captures'] },
      }),
    ]));

    const persisted = openFoundryStorage(database.path);
    const stored = readStoredSettings(persisted);
    persisted.close();
    expect(stored.features.library.captures.firecrawl.apiKey).toBe('secret');
    expect(existsSync(join(directory, 'settings.json'))).toBe(true);
    const databaseStat = await stat(join(database.path, 'settings.json'));
    expect(databaseStat.mode & 0o777).toBe(0o600);

    const clearResponse = await app.request('/api/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        captures: {
          firecrawlApiKey: '',
        },
      }),
    });
    expect(clearResponse.status).toBe(200);
    expect(await clearResponse.json()).toMatchObject({
      features: {
        library: {
          captures: {
            firecrawl: { apiKey: '' },
          },
        },
      },
    });
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
