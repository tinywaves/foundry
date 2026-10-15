import type { FoundryServer } from '.';
import process from 'node:process';

type ShutdownSignal = 'SIGINT' | 'SIGTERM';

interface SignalTarget {
  exitCode?: string | number | null;
  off: (event: ShutdownSignal, listener: () => void) => unknown;
  once: (event: ShutdownSignal, listener: () => void) => unknown;
}

export function formatServerStartError(error: unknown, port: number): string {
  if (error instanceof Error && 'code' in error && error.code === 'EADDRINUSE') {
    return `Port ${port} is already in use on 127.0.0.1.`;
  }

  const detail = error instanceof Error ? error.message : String(error);
  return `Could not start Foundry Server: ${detail}`;
}

export function registerShutdownHandlers(
  server: FoundryServer,
  target: SignalTarget = process,
  reportError: (message: string) => void = console.error,
): () => void {
  let isClosing = false;

  const shutdown = (): void => {
    if (isClosing) {
      return;
    }

    isClosing = true;
    target.off('SIGINT', shutdown);
    target.off('SIGTERM', shutdown);

    void server.close().catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      reportError(`Could not stop Foundry Server: ${detail}`);
      target.exitCode = 1;
    });
  };

  target.once('SIGINT', shutdown);
  target.once('SIGTERM', shutdown);

  return () => {
    target.off('SIGINT', shutdown);
    target.off('SIGTERM', shutdown);
  };
}
