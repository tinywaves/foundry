import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { FoundryEventHub } from '../src/events/hub';
import { PROVIDERS_CHANGED_EVENT } from '../src/features/providers/events';
import { getCurrentUsedProviderIds } from '../src/features/providers/usage';
import { DEFAULT_SETTINGS } from '../src/features/settings/contracts';
import { writeSettings } from '../src/features/settings/repository';
import { createApiApp } from '../src/server/api';
import { openFoundryDatabase } from '../src/storage/database';

const { join } = path;

it('creates, updates, and preserves provider credentials', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-providers-'));
  const settingsPath = join(directory, 'settings.json');
  const database = openFoundryDatabase(join(directory, 'foundry.sqlite'));
  writeSettings(DEFAULT_SETTINGS, settingsPath);

  try {
    const eventHub = new FoundryEventHub();
    const events: string[] = [];
    eventHub.subscribe((event) => {
      events.push(event.type);
    });
    const app = createApiApp(database, { eventHub, settingsPath });
    const postResponse = await app.request('/api/providers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Local OpenAI',
        protocol: 'openai-compatible-chat-completions',
        baseURL: 'http://127.0.0.1:11434/v1',
        apiKey: 'secret',
        customModels: [],
      }),
    });
    expect(postResponse.status).toBe(201);
    const created = await postResponse.json() as { id: string; apiKey: string };
    expect(created.apiKey).toBe('secret');

    const updateResponse = await app.request(`/api/providers/${created.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Local OpenAI',
        protocol: 'openai-compatible-chat-completions',
        baseURL: 'http://127.0.0.1:11434/v1',
        apiKey: '',
        customModels: [{ id: 'local-model', displayName: 'Local model' }],
      }),
    });
    expect(updateResponse.status).toBe(200);

    const listResponse = await app.request('/api/providers');
    const providers = await listResponse.json() as Array<{
      apiKey: string;
      customModels: unknown[];
    }>;
    expect(providers).toHaveLength(1);
    expect(providers[0]?.apiKey).toBe('secret');
    expect(providers[0]).toMatchObject({ isInUse: false });
    expect(providers[0]?.customModels).toHaveLength(1);
    expect(events.filter((type) => type === PROVIDERS_CHANGED_EVENT)).toHaveLength(2);

    vi.stubGlobal('fetch', vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json({
        data: [{ id: 'local-model', display_name: 'Local model' }],
      }))));

    const modelsResponse = await app.request(`/api/providers/${created.id}/models`);
    expect(modelsResponse.status).toBe(200);
    expect(await modelsResponse.json()).toEqual([{ id: 'local-model', displayName: 'Local model' }]);

    const clearResponse = await app.request(`/api/providers/${created.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Local OpenAI',
        protocol: 'openai-compatible-chat-completions',
        baseURL: 'http://127.0.0.1:11434/v1',
        apiKey: '',
        shouldClearApiKey: true,
        customModels: [{ id: 'local-model', displayName: 'Local model' }],
      }),
    });
    expect(clearResponse.status).toBe(200);
    expect(await clearResponse.json()).toMatchObject({ apiKey: '' });

    writeSettings({
      ...DEFAULT_SETTINGS,
      features: {
        ...DEFAULT_SETTINGS.features,
        agent: { provider: created.id },
      },
    }, settingsPath);
    expect(getCurrentUsedProviderIds(settingsPath)).toEqual(new Set([created.id]));

    const inUseResponse = await app.request('/api/providers');
    expect(await inUseResponse.json()).toMatchObject([{ id: created.id, isInUse: true }]);

    const disableResponse = await app.request(`/api/providers/${created.id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'disabled' }),
    });
    expect(disableResponse.status).toBe(409);
    expect(await disableResponse.json()).toMatchObject({
      error: { code: 'PROVIDER_IN_USE' },
    });

    const deletionResponse = await app.request(`/api/providers/${created.id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'deleted' }),
    });
    expect(deletionResponse.status).toBe(409);
    expect(await deletionResponse.json()).toMatchObject({
      error: { code: 'PROVIDER_IN_USE' },
    });

    writeSettings(DEFAULT_SETTINGS, settingsPath);
    const disableUnusedResponse = await app.request(`/api/providers/${created.id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'disabled' }),
    });
    expect(disableUnusedResponse.status).toBe(200);
  } finally {
    vi.unstubAllGlobals();
    database.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
