import { serve } from '@hono/node-server';
import { initializeFoundryStorage } from '../storage/index';
import { createApiApp } from './api';
import { createServerRuntime } from './runtime';

const hostname = '127.0.0.1';
const storage = initializeFoundryStorage();
const runtime = createServerRuntime(storage);
const app = createApiApp(storage, runtime.apiOptions);
runtime.start();

const server = serve(
  {
    fetch: app.fetch,
    hostname,
    port: 22_222,
  },
  () => {
    console.info('Foundry API is running at http://localhost:22222');
  },
);
server.on('close', runtime.stop);
