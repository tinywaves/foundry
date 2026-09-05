import { zValidator } from '@hono/zod-validator';
import { apiStatusCodes } from '@dhzh/foundry-api-contract';
import type {
  ProviderResponse,
  ProvidersResponse,
} from '@dhzh/foundry-api-contract';
import type { Hono } from 'hono';

import type { ProviderStore } from './store';
import {
  providerCreationSchema,
  providersQuerySchema,
} from './validation';

export function registerProviderRoutes(
  app: Hono,
  providerStore: ProviderStore,
): void {
  app.get(
    '/api/providers',
    zValidator('query', providersQuerySchema),
    (context) => context.json({
      status: apiStatusCodes.success,
      data: providerStore.listProviders(
        context.req.valid('query').runtime,
      ),
    } satisfies ProvidersResponse),
  );

  app.post(
    '/api/providers',
    zValidator('json', providerCreationSchema),
    (context) => context.json({
      status: apiStatusCodes.success,
      data: providerStore.createProvider(context.req.valid('json')),
    } satisfies ProviderResponse, 201),
  );
}
