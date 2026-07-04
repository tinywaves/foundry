import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

export function resolveWebRoot(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../web',
  );
}

export function createWebUiApp(webRoot = resolveWebRoot()) {
  const indexPath = path.join(webRoot, 'index.html');
  if (!existsSync(indexPath)) {
    throw new Error(
      'Web UI not built. Run `pnpm build:web` or `pnpm build` from the repo root.',
    );
  }

  const app = new Hono();
  app.use('/*', serveStatic({ root: webRoot }));

  return app;
}

export function startWebUiServer() {
  const app = createWebUiApp();
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
