import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { SSEStreamingApi } from 'hono/streaming';
import { FOUNDRY_EVENT_VERSION } from './contracts';
import type { FoundryEvent } from './contracts';
import type { FoundryEventHub } from './hub';

const HEARTBEAT_INTERVAL_MS = 15_000;

export function createEventRoutes(eventHub: FoundryEventHub): Hono {
  const app = new Hono();

  app.get('/', (c) => streamSSE(c, async (stream) => {
    await streamReady(stream);

    let isStopped = false;
    const { promise: stoppedPromise, resolve: resolveStopped } = Promise.withResolvers<undefined>();

    const stop = (): void => {
      if (isStopped) {
        return;
      }
      isStopped = true;
      resolveStopped(undefined);
    };

    const unsubscribe = eventHub.subscribe((event) => {
      if (!isStopped) {
        void writeEvent(stream, event);
      }
    });
    const heartbeat = setInterval(() => {
      if (!isStopped) {
        void writeHeartbeat(stream);
      }
    }, HEARTBEAT_INTERVAL_MS);

    const abort = (): void => {
      stop();
    };
    c.req.raw.signal.addEventListener('abort', abort, { once: true });
    stream.onAbort(stop);

    if (c.req.raw.signal.aborted) {
      stop();
    }

    await stoppedPromise;
    clearInterval(heartbeat);
    unsubscribe();
    c.req.raw.signal.removeEventListener('abort', abort);
  }));

  return app;
}

function streamReady(stream: SSEStreamingApi): Promise<void> {
  return stream.writeSSE({
    event: 'ready',
    data: JSON.stringify({ version: FOUNDRY_EVENT_VERSION }),
  });
}

function writeEvent(stream: SSEStreamingApi, event: FoundryEvent): Promise<void> {
  return stream.writeSSE({
    id: event.id,
    event: 'foundry',
    data: JSON.stringify(event),
  });
}

function writeHeartbeat(stream: SSEStreamingApi): Promise<void> {
  return stream.writeSSE({
    event: 'heartbeat',
    data: String(Date.now()),
  });
}
