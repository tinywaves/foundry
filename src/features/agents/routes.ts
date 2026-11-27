import type { Context } from 'hono';
import { Hono } from 'hono';

import {
  AgentError,
  parseUpdateAgentEnabledInput,
  parseUpdateAgentInstructionsInput,
} from './contracts';
import type { AgentsService } from './service';

export function createAgentRoutes(service: AgentsService): Hono {
  const app = new Hono();

  app.get('/', (c) => c.json(service.list()));

  app.put('/:id/instructions', async (c) => {
    try {
      const input = parseUpdateAgentInstructionsInput(await readJson(c));
      return c.json(service.updateInstructions(c.req.param('id'), input.instructionIds));
    } catch (error) {
      return agentError(c, error);
    }
  });

  app.put('/:id/enabled', async (c) => {
    try {
      const input = parseUpdateAgentEnabledInput(await readJson(c));
      return c.json(service.setEnabled(c.req.param('id'), input.enabled));
    } catch (error) {
      return agentError(c, error);
    }
  });

  app.post('/:id/reapply', (c) => {
    try {
      return c.json(service.reapply(c.req.param('id')));
    } catch (error) {
      return agentError(c, error);
    }
  });

  app.post('/:id/open-file', (c) => {
    try {
      return c.json(service.openInstructionFile(c.req.param('id')));
    } catch (error) {
      return agentError(c, error);
    }
  });

  return app;
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new AgentError('INVALID_AGENT_INPUT', 'Request body must be valid JSON', 400);
  }
}

function agentError(c: Context, error: unknown) {
  if (error instanceof AgentError) {
    return c.json(
      { error: { code: error.code, message: error.message } },
      error.status,
    );
  }

  throw error;
}
