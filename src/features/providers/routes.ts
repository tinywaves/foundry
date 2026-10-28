import type { Context } from 'hono';
import { Hono } from 'hono';
import type { FoundryDatabase } from '../../storage/database';
import {
  parseProviderConnection,
  parseProviderInput,
  parseProviderStatus,
  ProviderInputError,
} from './contracts';
import {
  fetchProviderModels,
  ProviderModelsError,
} from './models';
import {
  ProviderNotFoundError,
  ProviderRepository,
} from './repository';

export function createProviderRoutes(
  database: FoundryDatabase,
  onChanged: () => void = () => {},
): Hono {
  const app = new Hono();
  const repository = new ProviderRepository(database.db);

  app.get('/', (c) => c.json(repository.list()));

  app.get('/:id', (c) => {
    const provider = repository.get(c.req.param('id'));
    return provider
      ? c.json(provider)
      : c.json({ error: { code: 'PROVIDER_NOT_FOUND', message: 'Provider not found' } }, 404);
  });

  app.get('/:id/models', async (c) => {
    const connection = repository.getConnection(c.req.param('id'));
    if (!connection) {
      return c.json(
        { error: { code: 'PROVIDER_NOT_FOUND', message: 'Provider not found' } },
        404,
      );
    }

    try {
      return c.json(await fetchProviderModels(connection));
    } catch (error) {
      return providerError(c, error);
    }
  });

  app.post('/models', async (c) => {
    try {
      const connection = parseProviderConnection(await readJson(c));
      return c.json(await fetchProviderModels(connection));
    } catch (error) {
      return providerError(c, error);
    }
  });

  app.post('/', async (c) => {
    try {
      const input = parseProviderInput(await readJson(c));
      const provider = repository.save(input);
      onChanged();
      return c.json(provider, 201);
    } catch (error) {
      return providerError(c, error);
    }
  });

  app.put('/:id', async (c) => {
    try {
      const input = parseProviderInput(await readJson(c));
      const provider = repository.save(input, c.req.param('id'));
      onChanged();
      return c.json(provider);
    } catch (error) {
      return providerError(c, error);
    }
  });

  app.patch('/:id/status', async (c) => {
    try {
      const body = await readJson(c);
      const status = parseProviderStatus(
        typeof body === 'object' && body !== null && 'status' in body ? body.status : undefined,
      );
      const provider = repository.setStatus(c.req.param('id'), status);
      onChanged();
      return c.json(provider);
    } catch (error) {
      return providerError(c, error);
    }
  });

  return app;
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ProviderInputError('Request body must be valid JSON');
  }
}

function providerError(c: Context, error: unknown) {
  if (error instanceof ProviderInputError) {
    return c.json({ error: { code: error.code, message: error.message } }, 400);
  }
  if (error instanceof ProviderNotFoundError) {
    return c.json({ error: { code: error.code, message: error.message } }, 404);
  }
  if (error instanceof ProviderModelsError) {
    return c.json({ error: { code: error.code, message: error.message } }, 502);
  }

  throw error;
}
