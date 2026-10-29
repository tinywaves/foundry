import { readFile } from 'node:fs/promises';
import process from 'node:process';
import type { ArgsDef } from 'citty';
import { createServerRuntime } from '../server/runtime';
import type { ServerRuntime } from '../server/runtime';
import {
  initializeFoundryStorage,
} from '../storage/database';
import type { FoundryDatabase } from '../storage/database';

export const JSON_INPUT_ARGS = {
  'input': {
    type: 'string',
    description: 'JSON payload; use "-" to read it from stdin',
    valueHint: 'json',
  },
  'input-file': {
    type: 'string',
    description: 'Path to a JSON payload file',
    valueHint: 'path',
  },
} satisfies ArgsDef;

export interface CliSession {
  database: FoundryDatabase;
  runtime: ServerRuntime;
}

export async function runCliAction(
  action: (session: CliSession) => unknown,
): Promise<void> {
  let session: CliSession | undefined;

  try {
    const database = initializeFoundryStorage();
    const runtime = createServerRuntime(database);
    session = { database, runtime };

    writeJson(await action(session));
  } catch (error) {
    const details = describeCliError(error);
    console.error(JSON.stringify({ error: details }, null, 2));
    process.exitCode = 1;
  } finally {
    session?.database.client.close();
  }
}

export async function readJsonInput(
  args: { input?: string; inputFile?: string },
): Promise<unknown> {
  if (args.input !== undefined && args.inputFile !== undefined) {
    throw new CliInputError(
      'CONFLICTING_INPUT',
      'Use either --input or --input-file, not both',
    );
  }
  if (args.input === undefined && args.inputFile === undefined) {
    throw new CliInputError(
      'INPUT_REQUIRED',
      'Provide a JSON payload with --input or --input-file',
    );
  }

  let source: string;
  try {
    if (args.inputFile === undefined) {
      source = args.input === '-' ? await readStdin() : args.input ?? '';
    } else {
      source = args.inputFile === '-'
        ? await readStdin()
        : await readFile(args.inputFile, 'utf8');
    }
  } catch (error) {
    throw new CliInputError(
      'INPUT_READ_FAILED',
      error instanceof Error ? error.message : 'Unable to read JSON input',
    );
  }

  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new CliInputError('INVALID_JSON', 'Input must be valid JSON');
  }
}

async function readStdin(): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
  }

  return chunks.join('');
}

export function resolvePassphrase(value: string | undefined): string {
  const passphrase = value ?? process.env.FOUNDRY_PASSPHRASE;
  if (!passphrase) {
    throw new CliInputError(
      'PASSPHRASE_REQUIRED',
      'Provide --passphrase or set FOUNDRY_PASSPHRASE',
    );
  }

  return passphrase;
}

export class CliInputError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CliInputError';
  }
}

function writeJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function describeCliError(error: unknown): { code: string; message: string } {
  if (error instanceof Error) {
    return {
      code: readErrorCode(error) ?? 'CLI_ERROR',
      message: error.message,
    };
  }

  return {
    code: 'CLI_ERROR',
    message: String(error),
  };
}

function readErrorCode(error: Error): string | undefined {
  const code: unknown = Reflect.get(error, 'code');
  return typeof code === 'string' ? code : undefined;
}
