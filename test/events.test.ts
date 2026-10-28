import { Hono } from 'hono';
import { expect, it, vi } from 'vitest';
import { createEventRoutes } from '../src/events/routes';
import { FoundryEventHub } from '../src/events/hub';

it('publishes versioned events only while subscribed', () => {
  const eventHub = new FoundryEventHub();
  const listener = vi.fn();
  const unsubscribe = eventHub.subscribe(listener);

  const event = eventHub.publish('chat.started', { conversationId: 'conversation-1' });

  expect(event).toMatchObject({
    version: 1,
    type: 'chat.started',
    data: { conversationId: 'conversation-1' },
  });
  expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(new Date(event.occurredAt).toISOString()).toBe(event.occurredAt);

  unsubscribe();
  eventHub.publish('chat.started', { conversationId: 'conversation-2' });
  expect(listener).toHaveBeenCalledOnce();
});

it('streams foundry events over SSE', async () => {
  const eventHub = new FoundryEventHub();
  const app = new Hono();
  app.route('/events', createEventRoutes(eventHub));
  const controller = new AbortController();
  const response = await app.request('/events', { signal: controller.signal });

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/event-stream');

  const reader = response.body!.getReader();

  const decoder = new TextDecoder();
  let streamed = '';
  const readStream = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      streamed += decoder.decode(value, { stream: true });
    }
  })();

  try {
    await vi.waitFor(() => {
      expect(streamed).toContain('event: ready');
    });

    eventHub.publish('chat.delta', { text: 'hello' });

    await vi.waitFor(() => {
      expect(streamed).toContain('event: foundry');
      expect(streamed).toContain('"type":"chat.delta"');
      expect(streamed).toContain('"text":"hello"');
    });
  } finally {
    controller.abort();
    await reader.cancel();
    await readStream;
  }
});
