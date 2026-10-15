import { zValidator } from '@hono/zod-validator';
import {
  apiStatusCodes,
  applicationColorModes,
} from '@dhzh/foundry-api-contract';
import type { SettingsResponse } from '@dhzh/foundry-api-contract';
import type { Hono } from 'hono';
import { z } from 'zod';

import type { SettingsStore } from './store';

const settingsQuerySchema = z.strictObject({});
const updateSettingsSchema = z.strictObject({
  colorMode: z.enum(applicationColorModes),
});

export function registerSettingsRoutes(
  app: Hono,
  settingsStore: SettingsStore,
): void {
  app.get(
    '/api/settings',
    zValidator('query', settingsQuerySchema),
    (context) => context.json({
      status: apiStatusCodes.success,
      data: settingsStore.getApplicationSettings(),
    } satisfies SettingsResponse),
  );

  app.patch(
    '/api/settings',
    zValidator('json', updateSettingsSchema),
    (context) => context.json({
      status: apiStatusCodes.success,
      data: settingsStore.updateApplicationSettings(
        context.req.valid('json'),
      ),
    } satisfies SettingsResponse),
  );
}
