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

  await expect(new LocalRuntimeDetector(root, bin, runVersion, {}).detect('codex'))
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

it.each([
  ['codex', 'CODEX_HOME', 'config.toml'],
  ['claude-code', 'CLAUDE_CONFIG_DIR', 'settings.json'],
] as const)(
  'honors the %s configuration directory environment variable',
  async (runtime, environmentVariable, configurationFilename) => {
    const root = await createRoot();
    const configurationDirectory = path.join(root, 'custom-configuration');
    const configurationPath = path.join(configurationDirectory, configurationFilename);
    await mkdir(configurationDirectory);
    await writeFile(configurationPath, '');

    await expect(new LocalRuntimeDetector(
      root,
      '',
      () => Promise.resolve('unused'),
      { [environmentVariable]: configurationDirectory },
    ).detect(runtime)).resolves.toMatchObject({
      configurationExists: true,
      configurationPath,
    });
  },
);

it('reports an undetected Runtime without executing a version command', async () => {
  const root = await createRoot();
  const runVersion = vi.fn(() => Promise.resolve('unused'));

  await expect(new LocalRuntimeDetector(root, '', runVersion, {}).detect('claude-code'))
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
    {},
  ).detect('claude-code')).resolves.toMatchObject({
    executablePath,
    status: 'failed',
    version: null,
  });
});
