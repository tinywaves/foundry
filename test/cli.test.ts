import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { runCommand, showUsage } from 'citty';
import { settingsCommand } from '../src/cli/commands/settings';
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

it('reads and sets only the current settings keys', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-cli-settings-'));
  stubHome(directory);
  try {
    expect(await runJsonCommand(['settings', 'get'])).toEqual({
      'color-theme': 'system',
      'language': 'system',
      'time-zone': 'America/Los_Angeles',
      'time-format': 'YYYY-MM-DD HH:mm:ss',
      'config-folder': join(directory, '.foundry'),
    });
    for (const [key, value] of [['color-theme', 'dark'], ['language', 'zh-CN'], ['time-zone', 'Asia/Shanghai'], ['time-format', 'HH:mm:ss']]) {
      expect(await runJsonCommand(['settings', 'set', key, value])).toEqual({ key, value });
      expect(await runJsonCommand(['settings', 'get', key])).toBe(value);
    }
    const stored = JSON.parse(await readFile(join(directory, '.foundry', 'settings.json'), 'utf8')) as { workspace: { appearance: { 'color-theme': string } } };
    expect(stored.workspace.appearance['color-theme']).toBe('dark');
    expect(await runJsonCommand(['settings', 'get', 'config-folder'])).toBe(join(directory, '.foundry'));
  } finally {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});

it('rejects unknown keys, read-only settings and invalid values without writing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-cli-invalid-'));
  stubHome(directory);
  const previousExitCode = process.exitCode;
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const errors: string[] = [];
  const error = vi.spyOn(console, 'error').mockImplementation((value: unknown) => {
    errors.push(String(value));
  });
  try {
    for (const [args, code, message] of [
      [['settings', 'get', 'captures'], 'UNKNOWN_SETTING', 'Available keys'],
      [['settings', 'set', 'captures', 'firecrawl'], 'UNKNOWN_SETTING', 'Editable keys'],
      [['settings', 'set', 'config-folder', '/tmp'], 'READ_ONLY_SETTING', 'read-only'],
      [['settings', 'set', 'color-theme', 'invalid'], 'INVALID_SETTINGS_INPUT', 'system | light | dark'],
    ] as const) {
      errors.length = 0;
      process.exitCode = undefined;
      await runCommand(createFoundryCommand(), { rawArgs: [...args] });
      expect(process.exitCode).toBe(1);
      expect(JSON.parse(errors.join(''))).toMatchObject({ error: { code, message: expect.stringContaining(message) as unknown } });
    }
    expect(log).not.toHaveBeenCalled();
    const settings = await readFile(join(directory, '.foundry', 'settings.json'), 'utf8');
    expect(settings).toContain('"color-theme": "system"');
  } finally {
    log.mockRestore();
    error.mockRestore();
    process.exitCode = previousExitCode;
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});

it('limits the command tree to settings and web and documents allowed values', async () => {
  const command = createFoundryCommand();
  expect(Object.keys(command.subCommands ?? {})).toEqual(['help', 'web', 'settings']);
  const output: string[] = [];
  const log = vi.spyOn(console, 'log').mockImplementation((value: unknown) => {
    output.push(String(value));
  });
  try {
    const commands = await (typeof settingsCommand.subCommands === 'function'
      ? settingsCommand.subCommands()
      : settingsCommand.subCommands);
    const set = await (typeof commands?.set === 'function' ? commands.set() : commands?.set);
    if (!set) {
      throw new Error('Settings set command is missing');
    }
    await showUsage(set);
  } finally {
    log.mockRestore();
  }
  const help = output.join('\n');
  expect(help).toContain('Asia/Shanghai');
  expect(help).toContain('YYYY-MM-DD HH:mm:ss');
  expect(help).toContain('zh-TW');
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

it('exports and imports a backup through the CLI', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-cli-transfer-'));
  stubHome(directory);
  vi.stubEnv('FOUNDRY_PASSPHRASE', 'cli backup passphrase');

  try {
    await runJsonCommand(['settings', 'set', 'color-theme', 'dark']);
    await runJsonCommand(['settings', 'set', 'language', 'zh-CN']);
    const backupPath = join(directory, 'backup.foundry-backup');
    const exported = await runJsonCommand([
      'settings',
      'export',
      '--output',
      backupPath,
    ]) as { filePath: string };
    expect(exported).toEqual({ filePath: backupPath });
    const backupStat = await stat(backupPath);
    expect(backupStat.mode & 0o777).toBe(0o600);

    await runJsonCommand(['settings', 'set', 'color-theme', 'light']);
    await runJsonCommand(['settings', 'set', 'language', 'en-US']);
    const imported = await runJsonCommand([
      'settings',
      'import',
      backupPath,
    ]) as { status: string };
    expect(imported).toEqual({ status: 'imported' });
    expect(await runJsonCommand(['settings', 'get'])).toMatchObject({
      'color-theme': 'dark',
      'language': 'zh-CN',
    });
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
