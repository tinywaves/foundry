import { Hono } from 'hono';

const WEB_UI_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Foundry</title>
  </head>
  <body>
    <main>
      <h1>Foundry</h1>
    </main>
  </body>
</html>`;

export function createFoundryApp(): Hono {
  const app = new Hono();

  app.get('/', (context) => context.html(WEB_UI_HTML));

  return app;
}
