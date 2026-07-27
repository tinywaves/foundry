import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { SettingsService } from './types';

export const createSettingsRoutes = (settingsService: SettingsService) => new Hono()
  .get('/api/settings', (context) => context.json(settingsService.list()))
  .post(
    '/api/settings',
    zValidator(
      'json',
      z.array(z.object({
        group: z.string().min(1),
        name: z.string().min(1),
        value: z.json(),
      })),
      (result, context) => {
        if (!result.success) {
          return context.json(
            {
              error: 'Invalid settings input',
              issues: result.error.issues,
            },
            400,
          );
        }
      },
    ),
    (context) => {
      const entries = context.req.valid('json');
      try {
        settingsService.setMany(entries);
        return context.json(true);
      } catch {
        return context.json(
          {
            error: 'Failed to update settings',
          },
          500,
        );
      }
    },
  )
  .post(
    '/api/settings/reset',
    zValidator(
      'json',
      z.object({
        keys: z.array(z.object({
          group: z.string().min(1),
          name: z.string().min(1),
        })),
      }),
      (result, context) => {
        if (!result.success) {
          return context.json(
            {
              error: 'Invalid settings input',
              issues: result.error.issues,
            },
            400,
          );
        }
      },
    ),
    (context) => {
      const body = context.req.valid('json');
      try {
        settingsService.resetMany(body.keys);
        return context.json(true);
      } catch {
        return context.json(
          {
            error: 'Failed to reset settings',
          },
          500,
        );
      }
    },
  );

export type SettingsRoutes = ReturnType<typeof createSettingsRoutes>;
