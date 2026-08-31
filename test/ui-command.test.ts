import { runCommand } from 'citty';
import { expect, it, vi } from 'vitest';
import { createUiCommand, parsePort } from '../src/cli/ui-command';
import type { FoundryServer } from '../src/server';

const createServer = (port: number): FoundryServer => ({
  close: vi.fn(() => Promise.resolve()),
  hostname: '127.0.0.1',
  port,
  url: `http://127.0.0.1:${port}`,
});

it.each([
  ['54321', 54_321],
  ['1', 1],
  ['65535', 65_535],
])('parses port %s', (value, expected) => {
  expect(parsePort(value)).toBe(expected);
});

it.each(['0', '65536', '1.5', 'abc', ''])('rejects invalid port %s', (value) => {
  expect(() => parsePort(value)).toThrow('Port must be an integer between 1 and 65535');
});

it('starts the server on the default port and opens the browser', async () => {
  const server = createServer(54_321);
  const startServer = vi.fn(() => Promise.resolve(server));
  const openBrowser = vi.fn(() => Promise.resolve());
  const registerShutdown = vi.fn();
  const log = vi.fn();

  await runCommand(
    createUiCommand({
      error: vi.fn(),
      log,
      openBrowser,
      registerShutdown,
      setExitCode: vi.fn(),
      startServer,
    }),
    { rawArgs: [] },
  );

  expect(startServer).toHaveBeenCalledWith({ port: 54_321 });
  expect(registerShutdown).toHaveBeenCalledWith(server);
  expect(log).toHaveBeenCalledWith('Foundry Local Web UI: http://127.0.0.1:54321');
  expect(openBrowser).toHaveBeenCalledWith(server.url);
});

it('supports a custom port without opening the browser', async () => {
  const server = createServer(61_234);
  const startServer = vi.fn(() => Promise.resolve(server));
  const openBrowser = vi.fn(() => Promise.resolve());

  await runCommand(
    createUiCommand({
      error: vi.fn(),
      log: vi.fn(),
      openBrowser,
      registerShutdown: vi.fn(),
      setExitCode: vi.fn(),
      startServer,
    }),
    { rawArgs: ['--port', '61234', '--no-open'] },
  );

  expect(startServer).toHaveBeenCalledWith({ port: 61_234 });
  expect(openBrowser).not.toHaveBeenCalled();
});

it('does not stop the server when opening the browser fails', async () => {
  const server = createServer(54_321);
  const error = vi.fn();

  await runCommand(
    createUiCommand({
      error,
      log: vi.fn(),
      openBrowser: vi.fn(() => Promise.reject(new Error('browser unavailable'))),
      registerShutdown: vi.fn(),
      setExitCode: vi.fn(),
      startServer: vi.fn(() => Promise.resolve(server)),
    }),
    { rawArgs: [] },
  );

  expect(error).toHaveBeenCalledWith(
    'Could not open the default browser. Open http://127.0.0.1:54321 manually.',
  );
  expect(server.close).not.toHaveBeenCalled();
});

it('rejects unknown UI options without starting the server', async () => {
  const startServer = vi.fn();
  const error = vi.fn();
  const setExitCode = vi.fn();

  await runCommand(
    createUiCommand({
      error,
      log: vi.fn(),
      openBrowser: vi.fn(),
      registerShutdown: vi.fn(),
      setExitCode,
      startServer,
    }),
    { rawArgs: ['--unknown'] },
  );

  expect(startServer).not.toHaveBeenCalled();
  expect(error).toHaveBeenCalledWith('Unknown option: --unknown\nRun `foundry ui --help` for usage.');
  expect(setExitCode).toHaveBeenCalledWith(1);
});
