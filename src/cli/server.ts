import { existsSync } from 'node:fs';
import path from 'node:path';
import { exit } from 'node:process';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';

export function startWebUiServer() {
  const webPath = path.resolve(import.meta.dirname, '../web');
  const indexPath = path.join(webPath, 'index.html');

  if (!existsSync(indexPath)) {
    console.error('Web UI assets missing. Please reinstall Foundry: npm install -g @dhzh/foundry');
    exit(1);
  }

  const app = new Hono();
  app.use('/*', serveStatic({ root: webPath }));
  const server = serve({
    fetch: app.fetch,
    hostname: '127.0.0.1',
    port: 7777,
  });

  return {
    server,
    url: 'http://127.0.0.1:7777',
  };
}
