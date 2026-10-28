import type { Context } from 'hono';
import { Hono } from 'hono';
import {
  CaptureInputError,
  parseCaptureFilter,
  parseCreateCaptureInput,
  parseUserNote,
} from './contracts';
import { CaptureError } from './errors';
import type { CaptureService } from './service';

export function createCaptureRoutes(service: CaptureService): Hono {
  const app = new Hono();

  app.get('/', (c) => {
    const filter = parseCaptureFilter(c.req.query('filter'));
    return c.json(service.list(filter));
  });
  app.get('/counts', (c) => c.json(service.counts()));

  app.post('/', async (c) => {
    try {
      const input = parseCreateCaptureInput(await readJSON(c));
      return c.json(service.create(input), 201);
    } catch (error) {
      return captureError(c, error);
    }
  });

  app.get('/:id', (c) => {
    try {
      return c.json(service.get(c.req.param('id')));
    } catch (error) {
      return captureError(c, error);
    }
  });

  app.post('/:id/recapture', (c) => {
    try {
      return c.json(service.recapture(c.req.param('id')), 202);
    } catch (error) {
      return captureError(c, error);
    }
  });

  app.delete('/:id', (c) => {
    try {
      service.delete(c.req.param('id'));
      return c.body(null, 204);
    } catch (error) {
      return captureError(c, error);
    }
  });

  app.patch('/:id/note', async (c) => {
    try {
      const note = parseUserNote(await readJSON(c));
      return c.json(service.updateNote(c.req.param('id'), note));
    } catch (error) {
      return captureError(c, error);
    }
  });

  app.get('/:id/jobs', (c) => {
    try {
      return c.json(service.listJobs(c.req.param('id')));
    } catch (error) {
      return captureError(c, error);
    }
  });

  return app;
}

async function readJSON(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new CaptureInputError('Request body must be valid JSON');
  }
}

function captureError(c: Context, error: unknown) {
  if (error instanceof CaptureInputError) {
    return c.json({ error: { code: error.code, message: error.message } }, 400);
  }
  if (error instanceof CaptureError) {
    return c.json(
      { error: { code: error.code, message: error.message } },
      captureErrorStatus(error.code),
    );
  }

  throw error;
}

function captureErrorStatus(code: CaptureError['code']): 400 | 404 | 409 | 503 {
  switch (code) {
    case 'CAPTURE_NOT_FOUND': {
      return 404;
    }
    case 'CAPTURE_ALREADY_EXISTS':
    case 'ACTIVE_JOB_EXISTS': {
      return 409;
    }
    case 'FETCHER_NOT_CONFIGURED': {
      return 503;
    }
    default: {
      return 400;
    }
  }
}
