import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { FoundryEventHub } from '../src/events/hub';
import { SETTINGS_CHANGED_EVENT } from '../src/features/settings/events';
import { createApiApp } from '../src/server/api';
import { openFoundryDatabase } from '../src/storage/database';

const { join } = path;

it('persists settings without exposing capture API keys', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-settings-'));
  const settingsPath = join(directory, 'settings.json');
  const database = openFoundryDatabase(join(directory, 'foundry.sqlite'));

  try {
    const eventHub = new FoundryEventHub();
    const events: Array<{ type: string; data: unknown }> = [];
    eventHub.subscribe((event) => {
      events.push(event);
    });
    const app = createApiApp(database, { settingsPath, eventHub });

    const initialResponse = await app.request('/api/settings');
    expect(initialResponse.status).toBe(200);
    const initial = await initialResponse.json() as {
      workspace: { appearance: { 'color-theme': string } };
      features: {
        library: {
          captures: { firecrawl: { hasApiKey: boolean } };
        };
      };
    };
    expect(initial.workspace.appearance['color-theme']).toBe('system');
    expect(initial.features.library.captures.firecrawl.hasApiKey).toBe(false);

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
            firecrawl: { apiKey?: string; hasApiKey: boolean };
          };
        };
      };
    };
    expect(updated.workspace.appearance['color-theme']).toBe('dark');
    expect(updated.features.library.captures.firecrawl).toEqual({ hasApiKey: true });
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: SETTINGS_CHANGED_EVENT,
        data: { fields: ['theme', 'captures'] },
      }),
    ]));

    const stored = JSON.parse(await readFile(settingsPath, 'utf8')) as {
      features: { library: { captures: { firecrawl: { apiKey: string } } } };
    };
    expect(stored.features.library.captures.firecrawl.apiKey).toBe('secret');
    const settingsStat = await stat(settingsPath);
    expect(settingsStat.mode & 0o777).toBe(0o600);
  } finally {
    database.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
