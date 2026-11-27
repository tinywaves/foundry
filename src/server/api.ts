import { Hono } from 'hono';
import packageJson from '../../package.json' with { type: 'json' };
import { createCaptureRoutes } from '../features/captures/routes';
import { CAPTURES_CHANGED_EVENT } from '../features/captures/events';
import type { CaptureService } from '../features/captures/service';
import type { FoundryEventHub } from '../events/hub';
import { PROVIDERS_CHANGED_EVENT } from '../features/providers/events';
import { createProviderRoutes } from '../features/providers/routes';
import { ProviderService } from '../features/providers/service';
import { SETTINGS_CHANGED_EVENT } from '../features/settings/events';
import { createSettingsRoutes } from '../features/settings/routes';
import { SettingsService } from '../features/settings/service';
import { BundledSkillCopyService } from '../features/settings/skill-copy-service';
import { createSessionRoutes } from '../features/sessions/routes';
import { SessionService } from '../features/sessions/service';
import { createEventRoutes } from '../events/routes';
import type { FoundryStorage } from '../storage/index';
import { DataExportService } from '../features/data-export/service';
import { createDataExportRoutes } from '../features/data-export/routes';
import { DataImportService } from '../features/data-import/service';
import { createDataImportRoutes } from '../features/data-import/routes';

export interface ApiAppOptions {
  captureService?: CaptureService;
  dataExportService?: DataExportService;
  dataImportService?: DataImportService;
  providerService?: ProviderService;
  settingsService?: SettingsService;
  settingsSkillCopyService?: BundledSkillCopyService;
  sessionService?: SessionService;
  eventHub?: FoundryEventHub;
  onSettingsChanged?: () => void;
}

export function isApiPath(path: string): boolean {
  return path === '/api' || path.startsWith('/api/');
}

export function createApiApp(storage: FoundryStorage, options: ApiAppOptions = {}): Hono {
  const app = new Hono();
  const providerService = options.providerService
    ?? new ProviderService(storage);
  const settingsService = options.settingsService
    ?? new SettingsService(storage);
  const settingsSkillCopyService = options.settingsSkillCopyService
    ?? new BundledSkillCopyService();
  const sessionService = options.sessionService
    ?? new SessionService();

  app.get('/api/health', (c) => c.json({
    status: 'ok',
    version: packageJson.version,
    storage: {
      format: 'json',
      formatVersion: storage.formatVersion,
    },
  }));

  if (options.eventHub) {
    app.route('/api/events', createEventRoutes(options.eventHub));
  }
  app.route(
    '/api/data-import',
    createDataImportRoutes(options.dataImportService ?? new DataImportService(storage), () => {
      options.onSettingsChanged?.();
      options.eventHub?.publish(SETTINGS_CHANGED_EVENT, { fields: ['theme', 'language', 'timeFormat', 'timezone', 'captures'] });
    }),
  );
  app.route(
    '/api/data-export',
    createDataExportRoutes(options.dataExportService ?? new DataExportService(storage)),
  );
  app.route(
    '/api/providers',
    createProviderRoutes(providerService, () => {
      options.eventHub?.publish(PROVIDERS_CHANGED_EVENT, {});
    }),
  );
  app.route(
    '/api/settings',
    createSettingsRoutes(
      settingsService,
      (event) => {
        options.onSettingsChanged?.();
        options.eventHub?.publish(SETTINGS_CHANGED_EVENT, event);
      },
      settingsSkillCopyService,
    ),
  );
  app.route(
    '/api/sessions',
    createSessionRoutes(sessionService),
  );
  if (options.captureService) {
    app.route(
      '/api/captures',
      createCaptureRoutes(options.captureService, (event) => {
        options.eventHub?.publish(CAPTURES_CHANGED_EVENT, event);
      }),
    );
  }
  app.notFound((c) => {
    if (!isApiPath(c.req.path)) {
      return c.text('Not Found', 404);
    }

    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'API route not found',
        },
      },
      404,
    );
  });

  app.onError((error, c) => {
    console.error(error);
    return isApiPath(c.req.path)
      ? c.json(
          {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Internal server error',
            },
          },
          500,
        )
      : c.text('Internal Server Error', 500);
  });

  return app;
}
