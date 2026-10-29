import type { Context } from 'hono';
import { Hono } from 'hono';
import {
  parseSettingsPatch,
  SettingsInputError,
} from './contracts';
import type { SettingsChangedEvent } from './events';
import type { SettingsService } from './service';
import {
  BundledSkillInputError,
  parseBundledSkillCopyInput,
} from './skill-copy-contracts';
import {
  BundledSkillCopyError,
  BundledSkillCopyService,
} from './skill-copy-service';

export function createSettingsRoutes(
  service: SettingsService,
  onSettingsChanged: (event: SettingsChangedEvent) => void = () => {},
  skillCopyService = new BundledSkillCopyService(),
): Hono {
  const app = new Hono();

  app.get('/', (c) => c.json(service.read()));

  app.patch('/', async (c) => {
    try {
      const patch = parseSettingsPatch(await readJson(c));
      const settings = service.update(patch);
      onSettingsChanged({ fields: Object.keys(patch) });
      return c.json(settings);
    } catch (error) {
      return settingsError(c, error);
    }
  });

  app.post('/config-folder/open', (c) => {
    const settings = service.openConfigFolder();
    return c.json({ configFolder: settings.configFolder }, 202);
  });

  app.post('/skill-copy', async (c) => {
    try {
      const input = parseBundledSkillCopyInput(await readJson(c));
      return c.json(await skillCopyService.copyToTargets(input.targets));
    } catch (error) {
      return settingsError(c, error);
    }
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
  if (error instanceof BundledSkillInputError) {
    return c.json({ error: { code: error.code, message: error.message } }, 400);
  }
  if (error instanceof BundledSkillCopyError) {
    return c.json(
      { error: { code: error.code, message: error.message } },
      error.code === 'SKILL_NOT_FOUND' ? 404 : 500,
    );
  }

  throw error;
}
