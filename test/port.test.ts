import { createServer } from 'node:net';
import { expect, it } from 'vitest';
import { assertPortAvailable } from '../src/server/port';

it('detects an occupied server port', async () => {
  const server = createServer();

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    server.close();
    throw new Error('The test server did not expose a TCP port');
  }

  try {
    let occupiedError: unknown;
    try {
      await assertPortAvailable('127.0.0.1', address.port);
    } catch (error) {
      occupiedError = error;
    }
    expect(occupiedError).toMatchObject({ code: 'EADDRINUSE' });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  await expect(assertPortAvailable('127.0.0.1', address.port)).resolves.toBeUndefined();
});
