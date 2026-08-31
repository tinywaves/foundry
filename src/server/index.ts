import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import { createFoundryApp } from './app';

export const FOUNDRY_SERVER_HOSTNAME = '127.0.0.1';
export const FOUNDRY_SERVER_PORT = 54_321;

export interface FoundryServer {
  close: () => Promise<void>;
  hostname: typeof FOUNDRY_SERVER_HOSTNAME;
  port: number;
  url: string;
}

export interface StartFoundryServerOptions {
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

  return new Promise((resolve, reject) => {
    const handleListenError = (error: Error): void => {
      reject(error);
    };

    const server = serve(
      {
        fetch: createFoundryApp().fetch,
        hostname: FOUNDRY_SERVER_HOSTNAME,
        port,
      },
      (address) => {
        server.off('error', handleListenError);

        let closePromise: Promise<void> | undefined;
        const actualPort = address.port;

        resolve({
          close: () => {
            closePromise ??= closeServer(server);
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
