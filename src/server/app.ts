import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono } from 'hono';
import { createApiApp } from './api';

export function createApp(webRoot: string): Hono {
  const app = createApiApp();
  const staticFiles = serveStatic({ root: webRoot });

  app.use(
    '*',
    (c, next) => c.req.path.startsWith('/api/') ? next() : staticFiles(c, next),
  );

  app.get('*', serveStatic({ root: webRoot, path: '/index.html' }));

  return app;
}
