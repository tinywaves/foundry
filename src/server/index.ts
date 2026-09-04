import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import { createFoundryApp } from './app';
import { openFoundryDatabase } from './database';
import { DrizzleSettingsStore } from './settings-store';

export const FOUNDRY_SERVER_HOSTNAME = '127.0.0.1';
export const FOUNDRY_SERVER_PORT = 54_321;

export interface FoundryServer {
  close: () => Promise<void>;
  hostname: typeof FOUNDRY_SERVER_HOSTNAME;
  port: number;
  url: string;
}

export interface StartFoundryServerOptions {
  databasePath?: string;
  migrationsFolder?: string;
  port?: number;
}

function closeServer(server: ServerType): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export async function startFoundryServer(
  options: StartFoundryServerOptions = {},
): Promise<FoundryServer> {
  const port = options.port ?? FOUNDRY_SERVER_PORT;
  const database = await openFoundryDatabase({
    databasePath: options.databasePath,
    migrationsFolder: options.migrationsFolder,
  });
  const app = createFoundryApp({
    settingsStore: new DrizzleSettingsStore(database.db),
  });

  return new Promise((resolve, reject) => {
    const handleListenError = (error: Error): void => {
      database.client.close();
      reject(error);
    };

    const server = serve(
      {
        fetch: app.fetch,
        hostname: FOUNDRY_SERVER_HOSTNAME,
        port,
      },
      (address) => {
        server.off('error', handleListenError);

        let closePromise: Promise<void> | undefined;
        const actualPort = address.port;

        const closeFoundryServer = async () => {
          try {
            await closeServer(server);
          } finally {
            database.client.close();
          }
        };

        resolve({
          close: () => {
            closePromise ??= closeFoundryServer();
            return closePromise;
          },
          hostname: FOUNDRY_SERVER_HOSTNAME,
          port: actualPort,
          url: `http://${FOUNDRY_SERVER_HOSTNAME}:${actualPort}`,
        });
      },
    );

    server.once('error', handleListenError);
  });
}
