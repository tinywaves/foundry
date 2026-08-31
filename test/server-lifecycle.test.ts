import { expect, it, vi } from 'vitest';
import type { FoundryServer } from '../src/server';
import { registerShutdownHandlers } from '../src/server/lifecycle';

it('closes the server once when the process receives a shutdown signal', async () => {
  const close = vi.fn(() => Promise.resolve());
  const server: FoundryServer = {
    close,
    hostname: '127.0.0.1',
    port: 54_321,
    url: 'http://127.0.0.1:54321',
  };
  const listeners = new Map<string, () => void>();
  const target = {
    off: vi.fn((event: string) => listeners.delete(event)),
    once: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
  };

  registerShutdownHandlers(server, target);
  listeners.get('SIGINT')?.();
  listeners.get('SIGTERM')?.();

  await vi.waitFor(() => {
    expect(close).toHaveBeenCalledOnce();
  });
  expect(listeners.size).toBe(0);
});
