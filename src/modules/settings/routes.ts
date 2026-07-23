import { Hono } from 'hono';
import type { SettingInput, SettingsService } from './types';

export function createSettingsApi(settingsService: SettingsService) {
  return new Hono()
    .get(
      '/api/settings',
      (context) => context.json(settingsService.list()),
    )
    .post('/api/settings', async (context) => {
      const entries = await context.req.json<SettingInput[]>();
      return context.json(settingsService.setMany(entries));
    })
    .post('/api/settings/reset', async (context) => {
      const body = await context.req.json<{ keys: string[] }>();
      return context.json(settingsService.resetMany(body.keys));
    });
}

export type SettingsApi = ReturnType<typeof createSettingsApi>;
