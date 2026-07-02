import { Hono } from 'hono';
import { serve } from '@hono/node-server';

function createWebUiApp() {
  const app = new Hono();
  app.get('/', (context) => context.html(
    <html>
      <body>
        <h1>Hello Hono!</h1>
      </body>
    </html>,
  ));

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
