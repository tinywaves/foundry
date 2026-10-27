import { serve } from '@hono/node-server';
import { createApiApp } from './api';

const hostname = '127.0.0.1';
const app = createApiApp();

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
