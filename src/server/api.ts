import { Hono } from 'hono';
import packageJson from '../../package.json' with { type: 'json' };
import { createCaptureRoutes } from '../features/captures/routes';
import { CAPTURES_CHANGED_EVENT } from '../features/captures/events';
import type { CaptureService } from '../features/captures/service';
import { createDataTransferRoutes } from '../features/data-transfer/routes';
import type { DataTransferService } from '../features/data-transfer/service';
import {
  createWorkspaceMutationMiddleware,
  WorkspaceMutationGate,
} from '../features/data-transfer/workspace-mutation';
import type { FoundryEventHub } from '../events/hub';
import { DATA_TRANSFER_IMPORTED_EVENT } from '../features/data-transfer/events';
import { PROVIDERS_CHANGED_EVENT } from '../features/providers/events';
import { createProviderRoutes } from '../features/providers/routes';
import { SETTINGS_CHANGED_EVENT } from '../features/settings/events';
import { createSettingsRoutes } from '../features/settings/routes';
import { createEventRoutes } from '../events/routes';
import type { FoundryDatabase } from '../storage/database';

export interface ApiAppOptions {
  settingsPath?: string;
  captureService?: CaptureService;
  dataTransferService?: DataTransferService;
  workspaceMutationGate?: WorkspaceMutationGate;
  eventHub?: FoundryEventHub;
  onSettingsChanged?: () => void;
}

export function createApiApp(database: FoundryDatabase, options: ApiAppOptions = {}): Hono {
  const app = new Hono();
  const workspaceMutationGate = options.workspaceMutationGate
    ?? options.dataTransferService?.workspaceMutationGate
    ?? new WorkspaceMutationGate();

  app.use(
    '/api/*',
    createWorkspaceMutationMiddleware(workspaceMutationGate),
  );

  app.get('/api/health', (c) => c.json({
    status: 'ok',
    version: packageJson.version,
    database: {
      schemaVersion: database.schemaVersion,
    },
  }));

  if (options.eventHub) {
    app.route('/api/events', createEventRoutes(options.eventHub));
  }
  app.route(
    '/api/providers',
    createProviderRoutes(database, () => {
      options.eventHub?.publish(PROVIDERS_CHANGED_EVENT, {});
    }),
  );
  app.route(
    '/api/settings',
    createSettingsRoutes(options.settingsPath, (event) => {
      options.onSettingsChanged?.();
      options.eventHub?.publish(SETTINGS_CHANGED_EVENT, event);
    }),
  );
  if (options.captureService) {
    app.route(
      '/api/captures',
      createCaptureRoutes(options.captureService, (event) => {
        options.eventHub?.publish(CAPTURES_CHANGED_EVENT, event);
      }),
    );
  }
  if (options.dataTransferService) {
    app.route(
      '/api/data-transfer',
      createDataTransferRoutes(options.dataTransferService, () => {
        options.eventHub?.publish(DATA_TRANSFER_IMPORTED_EVENT, {});
      }),
    );
  }

  app.all('/api/*', (c) => c.json(
    {
      error: 'Not found',
    },
    404,
  ));

  return app;
}
