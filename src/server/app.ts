import { serveStatic } from '@hono/node-server/serve-static';
import { zValidator } from '@hono/zod-validator';
import {
  apiStatusCodes,
  applicationColorModes,
} from '@dhzh/foundry-api-contract';
import type {
  HealthResponse,
  ProviderResponse,
  ProvidersResponse,
  SettingsResponse,
} from '@dhzh/foundry-api-contract';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { z } from 'zod';

import type { SettingsStore } from './settings-store';
import type { ProviderStore } from './provider-store';
import {
  providerCreationSchema,
  providersQuerySchema,
} from './provider-validation';

const healthQuerySchema = z.strictObject({});
const settingsQuerySchema = z.strictObject({});
const updateSettingsSchema = z.strictObject({
  colorMode: z.enum(applicationColorModes),
});

export interface CreateFoundryAppOptions {
  providerStore: ProviderStore;
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

  app.get(
    '/api/settings',
    zValidator('query', settingsQuerySchema),
    (context) => context.json({
      status: apiStatusCodes.success,
      data: options.settingsStore.getApplicationSettings(),
    } satisfies SettingsResponse),
  );

  app.patch(
    '/api/settings',
    zValidator('json', updateSettingsSchema),
    (context) => context.json({
      status: apiStatusCodes.success,
      data: options.settingsStore.updateApplicationSettings(
        context.req.valid('json'),
      ),
    } satisfies SettingsResponse),
  );

  app.get(
    '/api/providers',
    zValidator('query', providersQuerySchema),
    (context) => context.json({
      status: apiStatusCodes.success,
      data: options.providerStore.listProviders(
        context.req.valid('query').runtime,
      ),
    } satisfies ProvidersResponse),
  );

  app.post(
    '/api/providers',
    zValidator('json', providerCreationSchema),
    (context) => context.json({
      status: apiStatusCodes.success,
      data: options.providerStore.createProvider(context.req.valid('json')),
    } satisfies ProviderResponse, 201),
  );

  const webRoot = options.webRoot ?? findDefaultWebRoot();
  if (webRoot) {
    app.use('*', serveStatic({ root: webRoot }));
  }

  return app;
}
