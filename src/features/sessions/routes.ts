import type { Context } from 'hono';
import { Hono } from 'hono';
import { SessionSourceError } from './contracts';
import type { SessionService } from './service';

export function createSessionRoutes(service: SessionService): Hono {
  const app = new Hono();

  app.get('/codex', (c) => {
    try {
      return c.json(service.getCodexSnapshot());
    } catch (error) {
      return sessionError(c, error);
    }
  });

  return app;
}

function sessionError(c: Context, error: unknown) {
  if (error instanceof SessionSourceError) {
    switch (error.code) {
      case 'CODEX_DATA_NOT_FOUND': {
        return c.json({ error: { code: error.code, message: error.message } }, 404);
      }
      case 'UNSUPPORTED_CODEX_SCHEMA': {
        return c.json({ error: { code: error.code, message: error.message } }, 422);
      }
      case 'CODEX_READ_FAILED': {
        return c.json({ error: { code: error.code, message: error.message } }, 500);
      }
    }
  }
  throw error;
}
