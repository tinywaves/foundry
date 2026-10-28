import type { Context } from 'hono';
import { Hono } from 'hono';
import { openPath } from '../../lib/open-path';
import { getFoundryHomePath, getFoundrySettingsPath } from '../../storage/paths';
import {
  parseSettingsPatch,
  SettingsInputError,
} from './contracts';
import { readSettings, updateSettings } from './repository';

export function createSettingsRoutes(
  settingsPath = getFoundrySettingsPath(),
  onSettingsChanged: () => void = () => {},
): Hono {
  const app = new Hono();

  app.get('/', (c) => c.json({
    ...readSettings(settingsPath),
    configFolder: getFoundryHomePath(),
  }));

  app.patch('/', async (c) => {
    try {
      const patch = parseSettingsPatch(await readJson(c));
      const settings = {
        ...updateSettings(patch, settingsPath),
        configFolder: getFoundryHomePath(),
      };
      onSettingsChanged();
      return c.json(settings);
    } catch (error) {
      return settingsError(c, error);
    }
  });

  app.post('/config-folder/open', (c) => {
    const configFolder = getFoundryHomePath();
    openPath(configFolder);
    return c.json({ configFolder }, 202);
  });

  return app;
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new SettingsInputError('Request body must be valid JSON');
  }
}

function settingsError(c: Context, error: unknown) {
  if (error instanceof SettingsInputError) {
    return c.json({ error: { code: error.code, message: error.message } }, 400);
  }

  throw error;
}
