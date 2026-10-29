import { serve } from '@hono/node-server';
import { initializeFoundryStorage } from '../storage/database';
import { createApiApp } from './api';
import { createServerRuntime } from './runtime';

const hostname = '127.0.0.1';
const database = initializeFoundryStorage();
const runtime = createServerRuntime(database);
const app = createApiApp(database, runtime.apiOptions);
runtime.start();

serve(
  {
    fetch: app.fetch,
    hostname,
    port: 22_222,
  },
  () => {
    console.info('Foundry API is running at http://localhost:22222');
  },
);
