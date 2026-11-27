import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';

import { updateSettings } from '../src/features/settings/repository';
import { createApiApp } from '../src/server/api';
import { createServerRuntime } from '../src/server/runtime';
import { openFoundryStorage } from '../src/storage/index';

it('streams repeated external settings replacements and releases the watcher on stop', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-settings-realtime-'));
  const storage = openFoundryStorage(directory);
  const external = openFoundryStorage(directory);
  const runtime = createServerRuntime(storage);
  runtime.start();
  const controller = new AbortController();
  const response = await createApiApp(storage, runtime.apiOptions).request('/api/events', { signal: controller.signal });
  const reader = response.body!.getReader();
  let events = '';
  const reading = (async () => {
    const decoder = new TextDecoder();
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      events += decoder.decode(chunk.value, { stream: true });
    }
  })();
  try {
    await vi.waitFor(() => expect(events).toContain('event: ready'));
    updateSettings({ theme: 'dark' }, external);
    await vi.waitFor(() => expect(events).toContain('"type":"settings.changed"'));
    expect(storage.readSettings().workspace.appearance['color-theme']).toBe('dark');
    events = '';
    updateSettings({ language: 'ja-JP', timezone: 'Asia/Tokyo' }, external);
    await vi.waitFor(() => expect(events).toContain('"type":"settings.changed"'));
    expect(storage.readSettings().workspace['language-region'].language).toBe('ja-JP');
    runtime.stop();
    events = '';
    updateSettings({ language: 'en-US' }, external);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(events).not.toContain('"type":"settings.changed"');
  } finally {
    runtime.stop();
    controller.abort();
    await reader.cancel();
    await reading;
    external.close();
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});
