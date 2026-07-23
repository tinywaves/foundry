import { existsSync } from 'node:fs';
import path from 'node:path';
import { exit } from 'node:process';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApplication } from '../application/create-application';
import { createSettingsApi } from '../modules/settings/routes';

export function startWebUiServer() {
  const webPath = path.resolve(import.meta.dirname, '../web');
  const indexPath = path.join(webPath, 'index.html');

  if (!existsSync(indexPath)) {
    console.error('Web UI assets missing. Please reinstall Foundry: npm install -g @dhzh/foundry');
    exit(1);
  }

  const application = createApplication();
  const app = createSettingsApi(application.settingsService);
  app.use('/*', serveStatic({ root: webPath }));

  try {
    const server = serve({
      fetch: app.fetch,
      hostname: '127.0.0.1',
      port: 7777,
    });

    return {
      server,
      url: 'http://127.0.0.1:7777',
      close: () => {
        server.close();
        application.close();
      },
    };
  } catch (error) {
    application.close();
    throw error;
  }
}
