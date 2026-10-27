import { Hono } from 'hono';
import packageJson from '../../package.json' with { type: 'json' };

export function createApiApp(): Hono {
  const app = new Hono();

  app.get('/api/health', (c) => c.json({
    status: 'ok',
    version: packageJson.version,
  }));

  app.all('/api/*', (c) => c.json(
    {
      error: 'Not found',
    },
    404,
  ));

  return app;
}
