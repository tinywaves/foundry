import { Buffer } from 'node:buffer';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { FoundryEventHub } from '../src/events/hub';
import { PROVIDERS_CHANGED_EVENT } from '../src/features/providers/events';
import { getCurrentUsedProviderIds } from '../src/features/providers/usage';
import { DEFAULT_SETTINGS } from '../src/features/settings/contracts';
import { writeSettings } from '../src/features/settings/repository';
import { createApiApp } from '../src/server/api';
import { openFoundryStorage } from '../src/storage/index';
import { MAX_PROVIDER_AVATAR_BYTES } from '../src/features/providers/contracts';

const { join } = path;
const pngAvatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=';

const svgAvatar = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" fill="#2563eb"/></svg>').toString('base64')}`;

it.each([pngAvatar, svgAvatar])('persists per-provider avatars, preserves omitted values, and clears back to the default (%#)', async (avatar) => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-provider-avatars-'));
  const storage = openFoundryStorage(directory);
  const input = { name: 'Custom avatar', protocol: 'openai-responses', baseURL: 'https://example.test/v1', apiKey: '', customModels: [] };
  try {
    const app = createApiApp(storage);
    const create = await app.request('/api/providers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, avatar }) });
    expect(create.status).toBe(201);
    const created = await create.json() as { id: string; avatar: string };
    expect(created.avatar).toBe(avatar);
    const providerData = JSON.parse(await readFile(join(directory, 'providers.json'), 'utf8'));
    expect(providerData).toMatchObject([{ id: created.id, avatar }]);
    const update = await app.request(`/api/providers/${created.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, name: 'Renamed' }) });
    expect(await update.json()).toMatchObject({ avatar, name: 'Renamed' });
    const reopened = openFoundryStorage(directory);
    try {
      const response = await createApiApp(reopened).request('/api/providers');
      expect(await response.json()).toMatchObject([{ id: created.id, avatar }]);
    } finally {
      reopened.close();
    }
    const clear = await app.request(`/api/providers/${created.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, avatar: null }) });
    expect(await clear.json()).toMatchObject({ avatar: null });
    const plain = await app.request('/api/providers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    expect(await plain.json()).toMatchObject({ avatar: null });

    for (const invalid of ['', 123, 'https://example.test/avatar.png', 'data:text/html;base64,PHN2Zy8+', 'data:image/svg+xml;base64,invalid', 'data:image/png;base64,invalid', 'data:image/png;base64,====', `data:image/png;base64,${'A'.repeat(Math.ceil((MAX_PROVIDER_AVATAR_BYTES + 1) / 3) * 4)}`]) {
      const response = await app.request(`/api/providers/${created.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, avatar: invalid }) });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: 'INVALID_PROVIDER_INPUT' } });
    }
    expect(storage.get('providers', created.id)?.avatar).toBeNull();
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('creates, updates, and preserves provider credentials', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-providers-'));
  const database = openFoundryStorage(directory);
  writeSettings(DEFAULT_SETTINGS, database);

  try {
    const eventHub = new FoundryEventHub();
    const events: string[] = [];
    eventHub.subscribe((event) => {
      events.push(event.type);
    });
    const app = createApiApp(database, { eventHub });
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
        apiKey: 'secret',
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
    }, database);
    expect(getCurrentUsedProviderIds(database)).toEqual(new Set([created.id]));

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

    writeSettings(DEFAULT_SETTINGS, database);
    const disableUnusedResponse = await app.request(`/api/providers/${created.id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'disabled' }),
    });
    expect(disableUnusedResponse.status).toBe(200);
  } finally {
    vi.unstubAllGlobals();
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
