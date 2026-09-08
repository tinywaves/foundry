import { zValidator } from '@hono/zod-validator';
import { apiStatusCodes } from '@dhzh/foundry-api-contract';
import type {
  Provider,
  ProviderCopyResponse,
  ProviderConnectionTestResponse,
  ProviderDeleteResponse,
  ProviderDetailResponse,
  ProviderResponse,
  ProviderSummary,
  ProviderUpdateResponse,
  ProvidersResponse,
} from '@dhzh/foundry-api-contract';
import type { Hono } from 'hono';

import type { ProviderStore } from './store';
import type { ProviderConnectionTester } from './connection-tester';
import {
  providerCreationSchema,
  providerPathSchema,
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
  providerConnectionTester: ProviderConnectionTester,
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

  app.delete(
    '/api/providers/:providerId',
    zValidator('param', providerPathSchema),
    (context) => {
      const result = providerStore.deleteProvider(
        context.req.valid('param').providerId,
      );
      if (result === 'in-use') {
        return context.json({
          status: apiStatusCodes.providerInUse,
          data: false,
          message: 'A Provider in use cannot be deleted.',
        } satisfies ProviderDeleteResponse);
      }
      if (result === 'not-found') {
        return context.json({
          status: apiStatusCodes.providerNotFound,
          data: false,
          message: 'The selected Provider is unavailable.',
        } satisfies ProviderDeleteResponse);
      }
      return context.json({
        status: apiStatusCodes.success,
        data: true,
      } satisfies ProviderDeleteResponse);
    },
  );

  app.post(
    '/api/providers/:providerId/test-connection',
    zValidator('param', providerPathSchema),
    async (context) => {
      const provider = providerStore.getProvider(
        context.req.valid('param').providerId,
      );
      if (provider === null) {
        return context.json({
          status: apiStatusCodes.providerNotFound,
          data: false,
          message: 'The selected Provider is unavailable.',
        } satisfies ProviderConnectionTestResponse);
      }

      const result = await providerConnectionTester.testProvider(provider);
      return result.successful
        ? context.json({
          status: apiStatusCodes.success,
          data: true,
        } satisfies ProviderConnectionTestResponse)
        : context.json({
          status: apiStatusCodes.providerConnectionFailed,
          data: false,
          message: result.message,
        } satisfies ProviderConnectionTestResponse);
    },
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

  app.get(
    '/api/providers/:providerId',
    zValidator('param', providerPathSchema),
    (context) => {
      const provider = providerStore.getProvider(
        context.req.valid('param').providerId,
      );

      return provider === null
        ? context.json({
          status: apiStatusCodes.providerNotFound,
          data: null,
          message: 'The selected Provider is unavailable.',
        } satisfies ProviderDetailResponse)
        : context.json({
          status: apiStatusCodes.success,
          data: provider,
        } satisfies ProviderDetailResponse);
    },
  );

  app.post(
    '/api/providers/:providerId/copy',
    zValidator('param', providerPathSchema),
    zValidator('json', providerCreationSchema),
    (context) => {
      const providerId = context.req.valid('param').providerId;
      const existing = providerStore.getProvider(providerId);
      if (existing === null) {
        return context.json({
          status: apiStatusCodes.providerNotFound,
          data: null,
          message: 'The selected Provider is unavailable.',
        } satisfies ProviderCopyResponse);
      }
      const input = context.req.valid('json');
      if (input.runtime !== existing.runtime) {
        return context.json({ message: 'A Provider Runtime cannot be changed.' }, 400);
      }
      const provider = providerStore.copyProvider(
        providerId,
        input,
      );

      return provider === null
        ? context.json({
          status: apiStatusCodes.providerNotFound,
          data: null,
          message: 'The selected Provider is unavailable.',
        } satisfies ProviderCopyResponse)
        : context.json({
          status: apiStatusCodes.success,
          data: toProviderSummary(provider),
        } satisfies ProviderCopyResponse, 201);
    },
  );

  app.put(
    '/api/providers/:providerId',
    zValidator('param', providerPathSchema),
    zValidator('json', providerCreationSchema),
    (context) => {
      const providerId = context.req.valid('param').providerId;
      const existing = providerStore.getProvider(providerId);
      if (existing === null) {
        return context.json({
          status: apiStatusCodes.providerNotFound,
          data: null,
          message: 'The selected Provider is unavailable.',
        } satisfies ProviderUpdateResponse);
      }
      const input = context.req.valid('json');
      if (input.runtime !== existing.runtime) {
        return context.json({ message: 'A Provider Runtime cannot be changed.' }, 400);
      }

      const provider = providerStore.updateProvider(providerId, input);
      return context.json({
        status: apiStatusCodes.success,
        data: provider === null ? null : toProviderSummary(provider),
      } satisfies ProviderUpdateResponse);
    },
  );
}
