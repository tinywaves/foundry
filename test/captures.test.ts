import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import type { FoundryEvent } from '../src/events/contracts';
import { FoundryEventHub } from '../src/events/hub';
import { FIRECRAWL_WIRE_PAGE_OPTIONS_KEY } from '../src/features/captures/fetchers/firecrawl';
import { createCaptureRuntime } from '../src/features/captures/runtime';
import { updateSettings } from '../src/features/settings/repository';
import { createApiApp } from '../src/server/api';
import { openFoundryDatabase } from '../src/storage/database';

const { join } = path;

function expectedEvent(type: string, data: Record<string, unknown>) {
  return expect.objectContaining({
    type,
    data: expect.objectContaining(data),
  });
}

it('captures a link through Firecrawl Search', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-captures-'));
  const settingsPath = join(directory, 'settings.json');
  const database = openFoundryDatabase(join(directory, 'foundry.sqlite'));
  updateSettings({
    captures: {
      fetcher: 'firecrawl',
      firecrawlApiKey: 'secret',
    },
  }, settingsPath);

  const rawResponse = {
    success: true,
    data: {
      web: [
        {
          url: 'https://example.com/article',
          title: 'Example page',
          description: 'An example article',
          summary: 'A longer summary from Firecrawl.',
          metadata: {
            sourceURL: 'https://example.com/article',
            statusCode: 200,
          },
        },
      ],
    },
    creditsUsed: 2,
  };
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(rawResponse)));
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
      rawResponse: typeof rawResponse | null;
    } = {
      capture: { title: null },
      rawResponse: null,
    };

    await vi.waitFor(async () => {
      const response = await app.request(`/api/captures/${created.id}`);
      expect(response.status).toBe(200);
      detail = await response.json() as typeof detail;
      expect(detail.rawResponse).toEqual(rawResponse);
    });

    expect(detail.capture.title).toBe('Example page');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.firecrawl.dev/v2/search',
      expect.objectContaining({ method: 'POST' }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1];
    const requestBodyText = requestInit?.body;
    if (typeof requestBodyText !== 'string') {
      throw new TypeError('Expected the Firecrawl request body to be JSON text');
    }
    const requestBody = JSON.parse(requestBodyText) as Record<string, unknown>;
    expect(requestBody).toMatchObject({
      query: 'site:example.com article',
      limit: 5,
      sources: ['web'],
      highlights: false,
    });
    expect(requestBody[FIRECRAWL_WIRE_PAGE_OPTIONS_KEY]).toMatchObject({
      formats: ['summary'],
    });

    const noteResponse = await app.request(`/api/captures/${created.id}/note`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userNote: 'Updated note' }),
    });
    expect(noteResponse.status).toBe(200);

    const captureDeletionResponse = await app.request(`/api/captures/${created.id}`, {
      method: 'DELETE',
    });
    expect(captureDeletionResponse.status).toBe(204);

    const expectedEvents = [
      expectedEvent('capture.job.changed', { status: 'pending' }),
      expectedEvent('capture.job.changed', { status: 'running' }),
      expectedEvent('captures.changed', { action: 'created' }),
      expectedEvent('captures.changed', { action: 'updated' }),
      expectedEvent('captures.changed', { action: 'deleted' }),
      expectedEvent('capture.job.changed', { status: 'succeeded' }),
    ];
    expect(events).toEqual(expect.arrayContaining(expectedEvents));
  } finally {
    vi.unstubAllGlobals();
    database.client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
