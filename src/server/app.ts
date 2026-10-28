import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono } from 'hono';
import type { ApiAppOptions } from './api';
import type { FoundryDatabase } from '../storage/database';
import { createApiApp } from './api';

export function createApp(
  webRoot: string,
  database: FoundryDatabase,
  options?: ApiAppOptions,
): Hono {
  const app = createApiApp(database, options);
  const staticFiles = serveStatic({ root: webRoot });

  app.use(
    '*',
    (c, next) => c.req.path.startsWith('/api/') ? next() : staticFiles(c, next),
  );

  app.get('*', serveStatic({ root: webRoot, path: '/index.html' }));

  return app;
}
