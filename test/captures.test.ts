import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import type { FoundryEvent } from '../src/events/contracts';
import { FoundryEventHub } from '../src/events/hub';
import { createCaptureRuntime } from '../src/features/captures/runtime';
import { updateSettings } from '../src/features/settings/repository';
import { createApiApp } from '../src/server/api';
import { openFoundryDatabase } from '../src/storage/database';

const { join } = path;

it('captures a page through the configured fetcher', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-captures-'));
  const settingsPath = join(directory, 'settings.json');
  const database = openFoundryDatabase(join(directory, 'foundry.sqlite'));
  updateSettings({
    captures: {
      fetcher: 'firecrawl',
      firecrawlApiKey: 'secret',
    },
  }, settingsPath);

  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(Response.json({
      data: {
        markdown: '# Captured page',
        metadata: { title: 'Example page' },
      },
    })));
  vi.stubGlobal('fetch', fetchMock);

  try {
    const eventHub = new FoundryEventHub();
    const events: FoundryEvent[] = [];
    eventHub.subscribe((event) => {
      events.push(event);
    });
    const runtime = createCaptureRuntime(database, settingsPath, eventHub);
    const app = createApiApp(database, {
      settingsPath,
      captureService: runtime.service,
      eventHub,
    });
    runtime.start();

    const postResponse = await app.request('/api/captures', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/article',
        userNote: 'Read later',
      }),
    });
    expect(postResponse.status).toBe(201);
    const created = await postResponse.json() as { id: string };

    let detail: {
      capture: { title: string | null };
      content: { markdown: string } | null;
    } = {
      capture: { title: null },
      content: null,
    };

    await vi.waitFor(async () => {
      const response = await app.request(`/api/captures/${created.id}`);
      expect(response.status).toBe(200);
      detail = await response.json() as typeof detail;
      expect(detail.content?.markdown).toBe('# Captured page');
    });

    expect(detail.capture.title).toBe('Example page');
    expect(fetchMock).toHaveBeenCalledOnce();

    const noteResponse = await app.request(`/api/captures/${created.id}/note`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userNote: 'Updated note' }),
    });
    expect(noteResponse.status).toBe(200);

    const deleteResponse = await app.request(`/api/captures/${created.id}`, {
      method: 'DELETE',
    });
    expect(deleteResponse.status).toBe(204);

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'capture.job.changed',
        data: expect.objectContaining({ status: 'pending' }),
      }),
      expect.objectContaining({
        type: 'capture.job.changed',
        data: expect.objectContaining({ status: 'running' }),
      }),
      expect.objectContaining({
        type: 'captures.changed',
        data: expect.objectContaining({ action: 'created' }),
      }),
      expect.objectContaining({
        type: 'captures.changed',
        data: expect.objectContaining({ action: 'updated' }),
      }),
      expect.objectContaining({
        type: 'captures.changed',
        data: expect.objectContaining({ action: 'deleted' }),
      }),
      expect.objectContaining({
        type: 'capture.job.changed',
        data: expect.objectContaining({ status: 'succeeded' }),
      }),
    ]));
  } finally {
    vi.unstubAllGlobals();
    database.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
