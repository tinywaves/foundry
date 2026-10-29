import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono } from 'hono';
import path from 'node:path';
import type { ApiAppOptions } from './api';
import type { FoundryDatabase } from '../storage/database';
import { createApiApp, isApiPath } from './api';

export function createApp(
  webRoot: string,
  database: FoundryDatabase,
  options?: ApiAppOptions,
): Hono {
  const app = createApiApp(database, options);
  const staticFiles = serveStatic({ root: webRoot });

  app.use(
    '*',
    (c, next) => isApiPath(c.req.path) ? next() : staticFiles(c, next),
  );

  const indexFile = serveStatic({ root: webRoot, path: '/index.html' });
  app.get('*', (c, next) => {
    const accept = c.req.header('accept')?.toLowerCase() ?? '';
    const isNavigation = accept.includes('text/html')
      && !isApiPath(c.req.path)
      && !c.req.path.startsWith('/assets/')
      && path.posix.extname(c.req.path) === '';

    return isNavigation ? indexFile(c, next) : next();
  });

  return app;
}
