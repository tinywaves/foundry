import {
  chmod,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

import { LocalRuntimeDetector } from '../src/server/runtimes/detection';

const temporaryRoots: string[] = [];

async function createRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'foundry-runtime-detection-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })));
});

it('detects an executable and reports the default configuration path', async () => {
  const root = await createRoot();
  const bin = path.join(root, 'bin');
  const executable = path.join(bin, 'codex');
  await mkdir(bin);
  await writeFile(executable, '#!/bin/sh\n');
  await chmod(executable, 0o755);
  const runVersion = vi.fn(() => Promise.resolve('codex-cli 1.0.0'));
  const executablePath = await realpath(executable);

  await expect(new LocalRuntimeDetector(root, bin, runVersion).detect('codex'))
    .resolves
    .toEqual({
      configurationExists: false,
      configurationPath: path.join(root, '.codex', 'config.toml'),
      executablePath,
      message: null,
      status: 'detected',
      version: 'codex-cli 1.0.0',
    });
  expect(runVersion).toHaveBeenCalledOnce();
});

it('reports an undetected Runtime without executing a version command', async () => {
  const root = await createRoot();
  const runVersion = vi.fn(() => Promise.resolve('unused'));

  await expect(new LocalRuntimeDetector(root, '', runVersion).detect('claude-code'))
    .resolves
    .toMatchObject({
      executablePath: null,
      status: 'not-detected',
      version: null,
    });
  expect(runVersion).not.toHaveBeenCalled();
});

it('reports a failed version check without losing the executable path', async () => {
  const root = await createRoot();
  const bin = path.join(root, 'bin');
  const executable = path.join(bin, 'claude');
  await mkdir(bin);
  await writeFile(executable, '#!/bin/sh\n');
  await chmod(executable, 0o755);

  const executablePath = await realpath(executable);
  await expect(new LocalRuntimeDetector(
    root,
    bin,
    () => Promise.reject(new Error('timeout')),
  ).detect('claude-code')).resolves.toMatchObject({
    executablePath,
    status: 'failed',
    version: null,
  });
});
