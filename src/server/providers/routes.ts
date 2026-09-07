import { zValidator } from '@hono/zod-validator';
import { apiStatusCodes } from '@dhzh/foundry-api-contract';
import type {
  Provider,
  ProviderResponse,
  ProviderSummary,
  ProvidersResponse,
} from '@dhzh/foundry-api-contract';
import type { Hono } from 'hono';

import type { ProviderStore } from './store';
import {
  providerCreationSchema,
  providersQuerySchema,
} from './validation';

function toProviderSummary(provider: Provider): ProviderSummary {
  return {
    avatar: provider.avatar,
    baseUrl: provider.configuration.baseUrl,
    id: provider.id,
    name: provider.name,
    officialWebsite: provider.officialWebsite,
    remark: provider.remark,
    runtime: provider.runtime,
  };
}

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
      ).map((element) => toProviderSummary(element)),
    } satisfies ProvidersResponse),
  );

  app.post(
    '/api/providers',
    zValidator('json', providerCreationSchema),
    (context) => {
      const input = context.req.valid('json');
      const provider = providerStore.createProvider(input);
      const summary = toProviderSummary(provider);

      return context.json({
        status: apiStatusCodes.success,
        data: summary,
      } satisfies ProviderResponse, 201);
    },
  );
}
