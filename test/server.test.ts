import { expect, it } from 'vitest';
import { startFoundryServer } from '../src/server';

it('listens only on loopback and closes cleanly', async () => {
  const server = await startFoundryServer({ port: 0 });

  try {
    expect(server.hostname).toBe('127.0.0.1');
    expect(server.url).toBe(`http://127.0.0.1:${server.port}`);

    const response = await fetch(server.url);
    expect(response.status).toBe(200);
  } finally {
    await server.close();
  }
});

it('rejects when the requested port is already in use', async () => {
  const firstServer = await startFoundryServer({ port: 0 });

  try {
    await expect(startFoundryServer({ port: firstServer.port })).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
  } finally {
    await firstServer.close();
  }
});
