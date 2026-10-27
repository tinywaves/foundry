import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const { dirname, join, resolve } = path;
const moduleDirectory = dirname(fileURLToPath(import.meta.url));

export function resolveWebRoot(): string {
  const candidates = [
    resolve(moduleDirectory, 'web'),
    resolve(process.cwd(), 'dist/web'),
  ];

  const webRoot = candidates.find((candidate) => existsSync(join(candidate, 'index.html')));

  if (!webRoot) {
    throw new Error('Web UI assets not found in dist/web. Run `pnpm build` before starting Foundry.');
  }

  return webRoot;
}
