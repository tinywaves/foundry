import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };

const cliPath = fileURLToPath(new URL('../src/cli/index.ts', import.meta.url));

function runCli(...args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
  });
}

it('shows root help when invoked without a command', () => {
  const result = runCli();

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('USAGE foundry ui');
  expect(result.stdout).toContain('ui    Start the Local Web UI');
});

it.each(['--version', '-v'])('prints the package version for %s', (flag) => {
  const result = runCli(flag);

  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe(packageJson.version);
});

it.each(['--help', '-h'])('supports the root help flag %s', (flag) => {
  const result = runCli(flag);

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('USAGE foundry ui');
});

it('shows UI command help without starting the server', () => {
  const result = runCli('ui', '--help');

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('--port=<port>');
  expect(result.stdout).toContain('--no-open');
});

it('rejects unknown root options', () => {
  const result = runCli('--unknown');

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Unknown option: --unknown');
});

it('rejects invalid UI ports', () => {
  const result = runCli('ui', '--port', '0', '--no-open');

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Port must be an integer between 1 and 65535');
});
