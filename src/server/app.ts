import { serveStatic } from '@hono/node-server/serve-static';
import { zValidator } from '@hono/zod-validator';
import { apiStatusCodes } from '@dhzh/foundry-api-contract';
import type { HealthResponse } from '@dhzh/foundry-api-contract';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { z } from 'zod';

import type { ProviderStore } from './providers/store';
import { registerProviderRoutes } from './providers/routes';
import { registerRuntimeRoutes } from './runtimes/routes';
import type { RuntimeService } from './runtimes/service';
import { registerSettingsRoutes } from './settings/routes';
import type { SettingsStore } from './settings/store';

const healthQuerySchema = z.strictObject({});

export interface CreateFoundryAppOptions {
  providerStore: ProviderStore;
  runtimeService: RuntimeService;
  settingsStore: SettingsStore;
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

export function createFoundryApp(options: CreateFoundryAppOptions): Hono {
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

  registerSettingsRoutes(app, options.settingsStore);
  registerProviderRoutes(app, options.providerStore);
  registerRuntimeRoutes(app, options.runtimeService);

  const webRoot = options.webRoot ?? findDefaultWebRoot();
  if (webRoot) {
    app.use('*', serveStatic({ root: webRoot }));
  }

  return app;
}
