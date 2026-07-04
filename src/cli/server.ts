import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

export function resolveInterfaceRoot(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../interface',
  );
}

export function createWebUiApp(interfaceRoot = resolveInterfaceRoot()) {
  const indexPath = path.join(interfaceRoot, 'index.html');
  if (!existsSync(indexPath)) {
    throw new Error(
      'Interface not built. Run `pnpm build` or `pnpm build:interface` first.',
    );
  }

  const app = new Hono();
  app.use('/*', serveStatic({ root: interfaceRoot }));

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
