import type { Context } from 'hono';
import { Hono } from 'hono';

import {
  InstructionInUseError,
  InstructionInputError,
  InstructionNotFoundError,
  parseCreateInstructionInput,
} from './contracts';
import type { InstructionsService } from './service';

export function createInstructionRoutes(service: InstructionsService): Hono {
  const app = new Hono();

  app.get('/', (c) => c.json(service.list()));

  app.get('/:id', (c) => {
    try {
      return c.json(service.get(c.req.param('id')));
    } catch (error) {
      return instructionError(c, error);
    }
  });

  app.post('/', async (c) => {
    try {
      const instruction = service.create(
        parseCreateInstructionInput(await readJson(c)),
      );
      return c.json(instruction, 201);
    } catch (error) {
      return instructionError(c, error);
    }
  });

  app.put('/:id', async (c) => {
    try {
      const input = parseCreateInstructionInput(await readJson(c));
      return c.json(service.update(c.req.param('id'), input));
    } catch (error) {
      return instructionError(c, error);
    }
  });

  app.delete('/:id', (c) => {
    try {
      service.delete(c.req.param('id'));
      return c.body(null, 204);
    } catch (error) {
      return instructionError(c, error);
    }
  });

  return app;
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new InstructionInputError('Request body must be valid JSON');
  }
}

function instructionError(c: Context, error: unknown) {
  if (error instanceof InstructionInputError) {
    return c.json({ error: { code: error.code, message: error.message } }, 400);
  }
  if (error instanceof InstructionNotFoundError) {
    return c.json({ error: { code: error.code, message: error.message } }, 404);
  }
  if (error instanceof InstructionInUseError) {
    return c.json({ error: { code: error.code, message: error.message } }, 409);
  }

  throw error;
}
