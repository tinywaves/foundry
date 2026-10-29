import { createServer } from 'node:net';

export function assertPortAvailable(hostname: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once('error', reject);
    server.listen(port, hostname, () => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });
}
