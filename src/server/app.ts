import { serveStatic } from '@hono/node-server/serve-static';
import { zValidator } from '@hono/zod-validator';
import { apiStatusCodes } from '@dhzh/foundry-api-contract';
import type { HealthResponse } from '@dhzh/foundry-api-contract';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { z } from 'zod';

const healthQuerySchema = z.strictObject({});

export interface CreateFoundryAppOptions {
  webRoot?: string;
}

function findDefaultWebRoot(): string | undefined {
  // Source development and the bundled CLI resolve import.meta.dirname differently.
  const candidates = [
    path.resolve(import.meta.dirname, 'app'),
    path.resolve(import.meta.dirname, '../../dist/app'),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

export function createFoundryApp(options: CreateFoundryAppOptions = {}): Hono {
  const app = new Hono();

  app.get(
    '/api/health',
    zValidator('query', healthQuerySchema),
    (context) => context.json({
      status: apiStatusCodes.success,
      data: true,
      message: 'Service is healthy.',
    } satisfies HealthResponse),
  );

  const webRoot = options.webRoot ?? findDefaultWebRoot();
  if (webRoot) {
    app.use('*', serveStatic({ root: webRoot }));
  }

  return app;
}
