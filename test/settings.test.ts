import { existsSync } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { FoundryEventHub } from '../src/events/hub';
import { SETTINGS_CHANGED_EVENT } from '../src/features/settings/events';
import { readStoredSettings } from '../src/features/settings/repository';
import { createApiApp } from '../src/server/api';
import { openFoundryDatabase } from '../src/storage/database';

const { join } = path;

it('persists settings and exposes capture API keys', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-settings-'));
  const database = openFoundryDatabase(join(directory, 'foundry.sqlite'));

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
    const entries = database.client.prepare('SELECT key, value FROM settings').all();
    expect(entries).toEqual(expect.arrayContaining([
      { key: '/workspace/appearance/color-theme', value: '"dark"' },
      { key: '/features/library/captures/firecrawl/apiKey', value: '"secret"' },
      { key: '/features/library/captures/fetchConcurrency', value: '2' },
      { key: '/features/library/captures/fetcher', value: '"firecrawl"' },
    ]));
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: SETTINGS_CHANGED_EVENT,
        data: { fields: ['theme', 'captures'] },
      }),
    ]));

    const persisted = openFoundryDatabase(database.path);
    const stored = readStoredSettings(persisted.db);
    persisted.client.close();
    expect(stored.features.library.captures.firecrawl.apiKey).toBe('secret');
    expect(existsSync(join(directory, 'settings.json'))).toBe(false);
    const databaseStat = await stat(database.path);
    expect(databaseStat.mode & 0o777).toBe(0o600);

    // Updating one setting must not rewrite unrelated keys.
    database.client.exec(`
      CREATE TRIGGER protect_theme BEFORE UPDATE ON settings
      WHEN OLD.key = '/workspace/appearance/color-theme'
      BEGIN SELECT RAISE(ABORT, 'theme must not be rewritten'); END;
      CREATE TRIGGER protect_settings_delete BEFORE DELETE ON settings
      BEGIN SELECT RAISE(ABORT, 'settings must not be replaced'); END;
    `);

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
    database.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
