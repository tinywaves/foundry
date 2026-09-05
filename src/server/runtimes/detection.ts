import type {
  ProviderRuntime,
  RuntimeDetection,
} from '@dhzh/foundry-api-contract';
import { access, realpath, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);
const VERSION_TIMEOUT_MS = 3000;

const runtimeDefinitions = {
  'claude-code': {
    command: 'claude',
    configurationPath: path.join('.claude', 'settings.json'),
  },
  'codex': {
    command: 'codex',
    configurationPath: path.join('.codex', 'config.toml'),
  },
} satisfies Record<ProviderRuntime, {
  command: string;
  configurationPath: string;
}>;

type RunVersion = (executablePath: string) => Promise<string>;

async function hasPath(filename: string): Promise<boolean> {
  try {
    await stat(filename);
    return true;
  } catch (error) {
    return Boolean(
      error
      && typeof error === 'object'
      && 'code' in error
      && error.code !== 'ENOENT',
    );
  }
}

async function findExecutable(
  command: string,
  environmentPath: string,
): Promise<string | null> {
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM').split(';')
    : [''];

  for (const directory of environmentPath.split(path.delimiter)) {
    if (!directory) {
      continue;
    }
    for (const extension of extensions) {
      const candidate = path.join(directory, `${command}${extension}`);
      try {
        await access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
        return await realpath(candidate);
      } catch {}
    }
  }

  return null;
}

export interface RuntimeDetector {
  detect: (runtime: ProviderRuntime) => Promise<RuntimeDetection>;
}

export class LocalRuntimeDetector implements RuntimeDetector {
  constructor(
    private readonly homeDirectory: string = homedir(),
    private readonly environmentPath: string = process.env.PATH ?? '',
    private readonly runVersion: RunVersion = async (executablePath) => {
      const result = await execFileAsync(executablePath, ['--version'], {
        timeout: VERSION_TIMEOUT_MS,
        windowsHide: true,
      });
      return (result.stdout || result.stderr).trim();
    },
  ) {}

  async detect(runtime: ProviderRuntime): Promise<RuntimeDetection> {
    const definition = runtimeDefinitions[runtime];
    const configurationPath = path.join(
      this.homeDirectory,
      definition.configurationPath,
    );
    const hasConfigurationFile = await hasPath(configurationPath);
    const executablePath = await findExecutable(
      definition.command,
      this.environmentPath,
    );

    if (!executablePath) {
      return {
        configurationExists: hasConfigurationFile,
        configurationPath,
        executablePath: null,
        message: `${definition.command} was not found in PATH.`,
        status: 'not-detected',
        version: null,
      };
    }

    try {
      return {
        configurationExists: hasConfigurationFile,
        configurationPath,
        executablePath,
        message: null,
        status: 'detected',
        version: await this.runVersion(executablePath),
      };
    } catch {
      return {
        configurationExists: hasConfigurationFile,
        configurationPath,
        executablePath,
        message: `${definition.command} --version could not be completed.`,
        status: 'failed',
        version: null,
      };
    }
  }
}
