import process from 'node:process';
import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import type { FoundryDatabase } from '../storage/database';
import { createApp } from './app';
import { createServerRuntime } from './runtime';
import { resolveWebRoot } from './web-root';

export interface StartServerOptions {
  database: FoundryDatabase;
  webRoot?: string;
  onListening?: (address: {
    url: string;
    webRoot: string;
  }) => void;
}

export function startServer({
  database,
  webRoot = resolveWebRoot(),
  onListening,
}: StartServerOptions): ServerType {
  const hostname = '127.0.0.1';
  const runtime = createServerRuntime(database);
  const app = createApp(webRoot, database, runtime.apiOptions);
  runtime.start();
  const server = serve(
    {
      fetch: app.fetch,
      hostname,
      port: 11_111,
    },
    () => {
      onListening?.({
        url: 'http://localhost:11111',
        webRoot,
      });
    },
  );

  server.on('error', (error) => {
    console.error(`Unable to start Foundry: ${error.message}`);
    process.exitCode = 1;
  });

  return server;
}
