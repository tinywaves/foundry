import { existsSync } from 'node:fs';
import {
  chmod,
  copyFile,
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
  ensureExportExtension,
} from '../../features/data-transfer/format';
import {
  CliInputError,
  resolvePassphrase,
  runCliAction,
} from '../shared';

const status = defineCommand({
  meta: {
    name: 'status',
    description: 'Read data-transfer and scrape-job status',
  },
  run() {
    return runCliAction(({ runtime }) =>
      runtime.services.dataTransferService.getStatus());
  },
});

const exportCommand = defineCommand({
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
    return runCliAction(async ({ runtime }) => {
      const service = runtime.services.dataTransferService;
      const passphrase = resolvePassphrase(args.passphrase);
      service.cleanupStaleTransfers();
      const exported = await service.createExport(passphrase);
      const destination = resolveExportDestination(args.output);

      try {
        await copyExport(exported, destination, args.force);
      } finally {
        await service.removeExportFile(exported.filePath);
      }

      return {
        ...exported,
        filePath: destination,
      };
    });
  },
});

const inspect = defineCommand({
  meta: {
    name: 'inspect',
    description: 'Validate a Foundry backup without importing it',
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
    return runCliAction(async ({ runtime }) => {
      const service = runtime.services.dataTransferService;
      service.cleanupStaleTransfers();
      const preview = await service.inspectImport(
        path.resolve(args.file),
        resolvePassphrase(args.passphrase),
      );

      try {
        return preview;
      } finally {
        await service.cancelImport(preview.importId);
      }
    });
  },
});

const importBackup = defineCommand({
  meta: {
    name: 'import',
    description: 'Validate and replace local Foundry data from a backup',
    alias: ['restore'],
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
    return runCliAction(async ({ runtime }) => {
      const service = runtime.services.dataTransferService;
      service.cleanupStaleTransfers();
      const preview = await service.inspectImport(
        path.resolve(args.file),
        resolvePassphrase(args.passphrase),
      );
      await service.commitImport(preview.importId);

      return {
        status: 'imported',
        preview,
      };
    });
  },
});

export const dataTransferCommand = defineCommand({
  meta: {
    name: 'data-transfer',
    description: 'Export or import encrypted Foundry backups',
    alias: ['data'],
  },
  subCommands: {
    status,
    export: exportCommand,
    inspect,
    import: importBackup,
  },
});

function resolveExportDestination(value: string | undefined): string {
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const output = value ?? `foundry-${timestamp}.foundry-backup`;

  return ensureExportExtension(path.resolve(output));
}

async function copyExport(
  exported: { filePath: string },
  destination: string,
  shouldForce: boolean,
): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  const temporaryDestination = path.join(
    path.dirname(destination),
    `.${path.basename(destination)}.${randomUUID()}.tmp`,
  );

  try {
    await copyFile(exported.filePath, temporaryDestination);
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
