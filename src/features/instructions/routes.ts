import type { Context } from 'hono';
import { Hono } from 'hono';

import {
  InstructionInputError,
  parseCreateInstructionInput,
} from './contracts';
import type { InstructionsService } from './service';

export function createInstructionRoutes(service: InstructionsService): Hono {
  const app = new Hono();

  app.get('/', (c) => c.json(service.list()));

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

  throw error;
}
