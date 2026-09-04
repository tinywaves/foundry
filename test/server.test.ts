import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { startFoundryServer } from '../src/server';

const fixture = { root: '' };
const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');

beforeAll(async () => {
  fixture.root = await mkdtemp(path.join(tmpdir(), 'foundry-server-'));
});

afterAll(async () => {
  await rm(fixture.root, { recursive: true, force: true });
});

it('listens only on loopback and closes cleanly', async () => {
  const server = await startFoundryServer({
    databasePath: path.join(fixture.root, 'server.sqlite'),
    migrationsFolder,
    port: 0,
  });

  try {
    expect(server.hostname).toBe('127.0.0.1');
    expect(server.url).toBe(`http://127.0.0.1:${server.port}`);

    const response = await fetch(`${server.url}/api/health`);
    expect(response.status).toBe(200);
  } finally {
    await server.close();
  }
});

it('rejects when the requested port is already in use', async () => {
  const firstServer = await startFoundryServer({
    databasePath: path.join(fixture.root, 'first.sqlite'),
    migrationsFolder,
    port: 0,
  });

  try {
    await expect(startFoundryServer({
      databasePath: path.join(fixture.root, 'second.sqlite'),
      migrationsFolder,
      port: firstServer.port,
    })).rejects.toMatchObject({ code: 'EADDRINUSE' });
  } finally {
    await firstServer.close();
  }
});
