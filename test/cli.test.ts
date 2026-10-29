import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { runCommand } from 'citty';
import { expect, it, vi } from 'vitest';
import { createFoundryCommand } from '../src/cli/main';

const { join } = path;

it('prints root help without initializing storage', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-cli-help-'));
  stubHome(directory);

  try {
    const output = await runJsonCommand([]);
    expect(output).toContain('USAGE foundry');
    expect(existsSync(join(directory, '.foundry'))).toBe(false);
  } finally {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});

it('returns parseable JSON errors for missing records', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-cli-errors-'));
  stubHome(directory);
  const output: string[] = [];
  const log = vi.spyOn(console, 'log').mockImplementation((...values: unknown[]) => {
    output.push(values.map(String).join(' '));
  });
  const errors: string[] = [];
  const error = vi.spyOn(console, 'error').mockImplementation((...values: unknown[]) => {
    errors.push(values.map(String).join(' '));
  });
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    await runCommand(createFoundryCommand(), {
      rawArgs: ['providers', 'get', 'missing-provider'],
    });
    expect(process.exitCode).toBe(1);
    expect(output).toEqual([]);
    expect(JSON.parse(errors.join('\n'))).toEqual({
      error: {
        code: 'PROVIDER_NOT_FOUND',
        message: 'Provider not found',
      },
    });

    process.exitCode = undefined;
    errors.length = 0;
    await runCommand(createFoundryCommand(), {
      rawArgs: ['captures', 'jobs', 'list', 'missing-capture'],
    });
    expect(process.exitCode).toBe(1);
    expect(JSON.parse(errors.join('\n'))).toEqual({
      error: {
        code: 'CAPTURE_NOT_FOUND',
        message: 'Capture not found',
      },
    });
  } finally {
    log.mockRestore();
    error.mockRestore();
    process.exitCode = previousExitCode;
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});

it('exposes settings and provider workflows through JSON commands', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-cli-data-'));
  stubHome(directory);

  try {
    const settings = await runJsonCommand([
      'settings',
      'update',
      '--input',
      JSON.stringify({ theme: 'dark' }),
    ]) as {
      configFolder: string;
      workspace: { appearance: { 'color-theme': string } };
    };
    expect(settings.configFolder).toBe(join(directory, '.foundry'));
    expect(settings.workspace.appearance['color-theme']).toBe('dark');

    const created = await runJsonCommand([
      'providers',
      'create',
      '--input',
      JSON.stringify({
        name: 'CLI Provider',
        protocol: 'openai-responses',
        baseURL: 'https://api.example.com/v1',
        apiKey: 'provider-secret',
        customModels: [],
      }),
    ]) as { id: string; name: string; apiKey: string };
    expect(created).toMatchObject({
      name: 'CLI Provider',
      apiKey: 'provider-secret',
    });

    const providers = await runJsonCommand(['providers', 'list']) as Array<{
      id: string;
    }>;
    expect(providers.map((provider) => provider.id)).toEqual([created.id]);
  } finally {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});

it('copies the bundled Foundry skill through the CLI', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-cli-skill-'));
  stubHome(directory);

  try {
    const downloaded = await runJsonCommand([
      'settings',
      'download-skill',
      '--target',
      '.agents,.claude',
    ]) as {
      installed: Array<{ target: string; destination: string }>;
    };
    expect(downloaded).toEqual({
      installed: [
        {
          target: 'agents',
          destination: join(directory, '.agents', 'skills', 'foundry'),
        },
        {
          target: 'claude',
          destination: join(directory, '.claude', 'skills', 'foundry'),
        },
      ],
    });
    const skill = await readFile(
      join(directory, '.agents', 'skills', 'foundry', 'SKILL.md'),
      'utf8',
    );
    expect(skill).toContain('name: foundry');
  } finally {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});

it('captures a URL and returns the scraped Markdown', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-cli-capture-'));
  stubHome(directory);
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(Response.json({
      data: {
        markdown: '# CLI capture',
        metadata: { title: 'Captured from CLI' },
      },
    })));
  vi.stubGlobal('fetch', fetchMock);

  try {
    await runJsonCommand([
      'settings',
      'update',
      '--input',
      JSON.stringify({
        captures: {
          fetcher: 'firecrawl',
          firecrawlApiKey: 'capture-secret',
        },
      }),
    ]);

    const captured = await runJsonCommand([
      'captures',
      'create',
      'https://example.com/cli',
      '--note',
      'CLI note',
    ]) as {
      capture: { id: string; title: string; userNote: string };
      content: { markdown: string };
      job: { id: string; status: string };
    };
    expect(captured).toMatchObject({
      capture: {
        title: 'Captured from CLI',
        userNote: 'CLI note',
      },
      content: {
        markdown: '# CLI capture',
      },
      job: {
        status: 'succeeded',
      },
    });

    const listedJobs = await runJsonCommand([
      'captures',
      'jobs',
      'list',
      captured.capture.id,
    ]) as Array<{ id: string; captureId: string; status: string }>;
    expect(listedJobs).toMatchObject([
      {
        id: captured.job.id,
        captureId: captured.capture.id,
        status: 'succeeded',
      },
    ]);

    const fetchedJob = await runJsonCommand([
      'captures',
      'jobs',
      'get',
      captured.capture.id,
      captured.job.id,
    ]) as { id: string; status: string };
    expect(fetchedJob).toMatchObject({
      id: captured.job.id,
      status: 'succeeded',
    });

    const recaptured = await runJsonCommand([
      'captures',
      'jobs',
      'recapture',
      captured.capture.id,
    ]) as { id: string; status: string };
    expect(recaptured).toMatchObject({ status: 'succeeded' });
    expect(recaptured.id).not.toBe(captured.job.id);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});

it('exports and imports a backup through the CLI', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-cli-transfer-'));
  stubHome(directory);
  vi.stubEnv('FOUNDRY_PASSPHRASE', 'cli backup passphrase');

  try {
    const created = await runJsonCommand([
      'providers',
      'create',
      '--input',
      JSON.stringify({
        name: 'Backup Provider',
        protocol: 'openai-responses',
        baseURL: 'https://api.example.com/v1',
        apiKey: 'provider-secret',
        customModels: [],
      }),
    ]) as { id: string };

    const backupPath = join(directory, 'backup.foundry-backup');
    const exported = await runJsonCommand([
      'data-transfer',
      'export',
      '--output',
      backupPath,
    ]) as { filePath: string; providerCount: number };
    expect(exported).toMatchObject({
      filePath: backupPath,
      providerCount: 1,
    });
    const backupStat = await stat(backupPath);
    expect(backupStat.mode & 0o777).toBe(0o600);

    await runJsonCommand([
      'providers',
      'set-status',
      created.id,
      '--status',
      'deleted',
    ]);
    expect(await runJsonCommand(['providers', 'list'])).toEqual([]);

    const imported = await runJsonCommand([
      'data-transfer',
      'import',
      backupPath,
    ]) as { status: string; preview: { providerCount: number } };
    expect(imported).toMatchObject({
      status: 'imported',
      preview: { providerCount: 1 },
    });
    expect(await runJsonCommand(['providers', 'list']))
      .toMatchObject([{ id: created.id, status: 'active' }]);
  } finally {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});

async function runJsonCommand(rawArgs: string[]): Promise<unknown> {
  const output: string[] = [];
  const log = vi.spyOn(console, 'log').mockImplementation((...values: unknown[]) => {
    output.push(values.map(String).join(' '));
  });
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;

  try {
    await runCommand(createFoundryCommand(), { rawArgs });
    expect(process.exitCode).toBeUndefined();
    expect(error).not.toHaveBeenCalled();
    return parseOutput(output.join('\n'));
  } finally {
    log.mockRestore();
    error.mockRestore();
    process.exitCode = previousExitCode;
  }
}

function parseOutput(output: string): unknown {
  try {
    return JSON.parse(output) as unknown;
  } catch {
    return output;
  }
}

function stubHome(directory: string): void {
  vi.stubEnv('HOME', directory);
  vi.stubEnv('USERPROFILE', directory);
}
