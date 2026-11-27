import { existsSync } from 'node:fs';
import {
  chmod,
  writeFile,
  link,
  mkdir,
  rename,
  rm,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { defineCommand } from 'citty';
import {
  CliInputError,
  resolvePassphrase,
  runCliAction,
} from '../shared';

export const exportCommand = defineCommand({
  meta: {
    name: 'export',
    description: 'Write an encrypted Foundry backup',
  },
  args: {
    passphrase: {
      type: 'string',
      description: 'Encryption passphrase; defaults to FOUNDRY_PASSPHRASE',
      valueHint: 'text',
    },
    output: {
      type: 'string',
      description: 'Destination .foundry-backup path',
      valueHint: 'path',
      alias: ['o'],
    },
    force: {
      type: 'boolean',
      description: 'Overwrite an existing destination file',
      default: false,
    },
  },
  run({ args }) {
    return runCliAction(async ({ dataExportService }) => {
      const exported = await dataExportService.createExport(resolvePassphrase(args.passphrase));
      const destination = resolveExportDestination(args.output);

      await copyExport(exported.contents, destination, args.force);
      return { filePath: destination };
    });
  },
});

export const importBackup = defineCommand({
  meta: {
    name: 'import',
    description: 'Replace local Foundry data from an encrypted backup',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to a .foundry-backup file',
      required: true,
    },
    passphrase: {
      type: 'string',
      description: 'Decryption passphrase; defaults to FOUNDRY_PASSPHRASE',
      valueHint: 'text',
    },
  },
  run({ args }) {
    return runCliAction(async ({ dataImportService }) => {
      await dataImportService.importData(
        path.resolve(args.file),
        resolvePassphrase(args.passphrase),
      );
      return { status: 'imported' };
    });
  },
});

function resolveExportDestination(value: string | undefined): string {
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const output = value ?? `foundry-${timestamp}.foundry-backup`;

  const destination = path.resolve(output);
  return destination.toLowerCase().endsWith('.foundry-backup') ? destination : `${destination}.foundry-backup`;
}

async function copyExport(
  contents: Uint8Array,
  destination: string,
  shouldForce: boolean,
): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  const temporaryDestination = path.join(
    path.dirname(destination),
    `.${path.basename(destination)}.${randomUUID()}.tmp`,
  );

  try {
    await writeFile(temporaryDestination, contents, { mode: 0o600 });
    if (process.platform !== 'win32') {
      await chmod(temporaryDestination, 0o600);
    }

    if (shouldForce) {
      await rename(temporaryDestination, destination);
      return;
    }

    if (existsSync(destination)) {
      throw outputExists(destination);
    }

    try {
      await link(temporaryDestination, destination);
    } catch (error) {
      if (isFileExistsError(error)) {
        throw outputExists(destination);
      }
      throw error;
    }
  } finally {
    await rm(temporaryDestination, { force: true });
  }
}

function outputExists(destination: string): CliInputError {
  return new CliInputError(
    'OUTPUT_EXISTS',
    `Destination already exists: ${destination}`,
  );
}

function isFileExistsError(error: unknown): boolean {
  return error instanceof Error && Reflect.get(error, 'code') === 'EEXIST';
}
