import { Hono } from 'hono';
import packageJson from '../../package.json' with { type: 'json' };
import { createCaptureRoutes } from '../features/captures/routes';
import type { CaptureService } from '../features/captures/service';
import { createDataTransferRoutes } from '../features/data-transfer/routes';
import type { DataTransferService } from '../features/data-transfer/service';
import { createProviderRoutes } from '../features/providers/routes';
import { createSettingsRoutes } from '../features/settings/routes';
import type { FoundryDatabase } from '../storage/database';

export interface ApiAppOptions {
  settingsPath?: string;
  captureService?: CaptureService;
  dataTransferService?: DataTransferService;
  onSettingsChanged?: () => void;
}

export function createApiApp(database: FoundryDatabase, options: ApiAppOptions = {}): Hono {
  const app = new Hono();

  app.get('/api/health', (c) => c.json({
    status: 'ok',
    version: packageJson.version,
    database: {
      schemaVersion: database.schemaVersion,
    },
  }));

  app.route('/api/providers', createProviderRoutes(database));
  app.route(
    '/api/settings',
    createSettingsRoutes(options.settingsPath, options.onSettingsChanged),
  );
  if (options.captureService) {
    app.route('/api/captures', createCaptureRoutes(options.captureService));
  }
  if (options.dataTransferService) {
    app.route('/api/data-transfer', createDataTransferRoutes(options.dataTransferService));
  }

  app.all('/api/*', (c) => c.json(
    {
      error: 'Not found',
    },
    404,
  ));

  return app;
}
