import type {
  FoundryExportModuleId,
  FoundryImportModuleResult,
  FoundryImportResult,
} from '@dhzh/foundry-api-contract';
import {
  applicationColorModes,
  foundryExportFormat,
  foundryExportModuleIds,
} from '@dhzh/foundry-api-contract';
import type { Entry } from '@zip.js/zip.js';
import {
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
} from '@zip.js/zip.js';
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { z } from 'zod';

import type { ProviderStore } from '../providers/store';
import { providerCreationSchema } from '../providers/validation';
import type { SettingsStore } from '../settings/store';

const MAX_ARCHIVE_ENTRIES = 256;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_MODULE_BYTES = 256 * 1024 * 1024;
const jsonDecoder = new TextDecoder('utf-8', { fatal: true });
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

const importModuleManifestSchema = z.strictObject({
  id: z.string().min(1).max(100).regex(/^[a-z][a-z0-9-]*$/u),
  mediaType: z.string().min(1).max(100),
  overwrite: z.boolean(),
  path: z.string().min(1).max(512),
  sha256: sha256Schema,
  size: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});

const importManifestSchema = z.strictObject({
  createdAt: z.string().min(1).max(64).refine(
    (value) => !Number.isNaN(Date.parse(value)),
  ),
  format: z.literal(foundryExportFormat),
  foundryVersion: z.string().min(1).max(100),
  modules: z.array(importModuleManifestSchema).max(MAX_ARCHIVE_ENTRIES),
}).superRefine((manifest, context) => {
  const ids = new Set<string>();
  const paths = new Set<string>();

  for (const [index, module] of manifest.modules.entries()) {
    if (ids.has(module.id)) {
      context.addIssue({
        code: 'custom',
        message: 'Export Module identifiers must be unique.',
        path: ['modules', index, 'id'],
      });
    }
    if (paths.has(module.path)) {
      context.addIssue({
        code: 'custom',
        message: 'Export Module paths must be unique.',
        path: ['modules', index, 'path'],
      });
    }
    ids.add(module.id);
    paths.add(module.path);
  }
});

type ImportModuleManifest = z.infer<typeof importModuleManifestSchema>;

const settingsImportSchema = z.strictObject({
  colorMode: z.enum(applicationColorModes),
});
const providersImportSchema = z.array(providerCreationSchema);

export class FoundryImportFileError extends Error {
  constructor(cause?: unknown) {
    super('The selected file is not a valid Foundry Export.', { cause });
    this.name = 'FoundryImportFileError';
  }
}

function isKnownModuleId(id: string): id is FoundryExportModuleId {
  return foundryExportModuleIds.includes(id as FoundryExportModuleId);
}

function findFileEntry(entries: Entry[], path: string) {
  const entry = entries.find((candidate) => candidate.filename === path);
  if (!entry || entry.directory || entry.encrypted || entry.symlink) {
    throw new Error('The Export Module entry is unavailable.');
  }
  return entry;
}

async function readJsonEntry(
  entry: ReturnType<typeof findFileEntry>,
  maximumBytes: number,
): Promise<unknown> {
  if (entry.uncompressedSize > maximumBytes) {
    throw new Error('The archive entry is too large.');
  }

  const content = await entry.getData(new Uint8ArrayWriter());
  if (content.byteLength > maximumBytes) {
    throw new Error('The archive entry is too large.');
  }

  return JSON.parse(jsonDecoder.decode(content)) as unknown;
}

async function readManifest(entries: Entry[]) {
  try {
    const manifest = importManifestSchema.parse(await readJsonEntry(
      findFileEntry(entries, 'manifest.json'),
      MAX_MANIFEST_BYTES,
    ));
    const declaredPaths = new Set([
      'manifest.json',
      ...manifest.modules.map((module) => module.path),
    ]);
    const hasUndeclaredFiles = entries.some(
      (entry) => !entry.directory && !declaredPaths.has(entry.filename),
    );
    const moduleIds = new Set(manifest.modules.map((module) => module.id));

    if (
      hasUndeclaredFiles
      || foundryExportModuleIds.some((id) => !moduleIds.has(id))
    ) {
      throw new Error('The Foundry Export package is incomplete.');
    }

    return manifest;
  } catch (error) {
    throw new FoundryImportFileError(error);
  }
}

async function readModuleJson(
  module: ImportModuleManifest,
  entries: Entry[],
): Promise<unknown> {
  if (module.mediaType !== 'application/json' || module.size > MAX_MODULE_BYTES) {
    throw new Error('The Export Module metadata is invalid.');
  }

  const entry = findFileEntry(entries, module.path);
  if (entry.uncompressedSize !== module.size) {
    throw new Error('The Export Module size does not match its manifest.');
  }

  const content = await entry.getData(new Uint8ArrayWriter());
  const digest = createHash('sha256').update(content).digest('hex');
  if (content.byteLength !== module.size || digest !== module.sha256) {
    throw new Error('The Export Module does not match its manifest.');
  }

  return JSON.parse(jsonDecoder.decode(content)) as unknown;
}

function failedModule(id: string): FoundryImportModuleResult {
  return {
    id,
    importedItems: 0,
    message: `${id === 'settings' ? 'Application Settings' : 'Providers'} could not be imported.`,
    status: 'failed',
  };
}

export class FoundryImportService {
  constructor(
    private readonly providerStore: ProviderStore,
    private readonly settingsStore: SettingsStore,
  ) {}

  async importData(content: Uint8Array<ArrayBuffer>): Promise<FoundryImportResult> {
    if (content.byteLength === 0) {
      throw new FoundryImportFileError();
    }

    const reader = new ZipReader(new Uint8ArrayReader(content), {
      checkCrc32: true,
      filenameValidation: 'strict',
      maxAppendedDataSize: 0,
      strictness: 'strict',
    });

    try {
      let entries: Entry[];
      try {
        entries = await reader.getEntries();
      } catch (error) {
        throw new FoundryImportFileError(error);
      }
      if (entries.length > MAX_ARCHIVE_ENTRIES) {
        throw new FoundryImportFileError();
      }

      const manifest = await readManifest(entries);
      const modules: FoundryImportModuleResult[] = [];

      for (const module of manifest.modules) {
        if (!isKnownModuleId(module.id)) {
          modules.push({
            id: module.id,
            importedItems: 0,
            message: 'This Export Module is not supported by this Foundry version.',
            status: 'unsupported',
          });
          continue;
        }

        try {
          const moduleData = await readModuleJson(module, entries);
          if (module.id === 'settings') {
            if (!module.overwrite) {
              throw new Error('Application Settings must use overwrite import behavior.');
            }
            this.settingsStore.updateApplicationSettings(
              settingsImportSchema.parse(moduleData),
            );
            modules.push({ id: module.id, importedItems: 1, status: 'imported' });
          } else {
            if (module.overwrite) {
              throw new Error('Providers must use append import behavior.');
            }
            const providers = providersImportSchema.parse(moduleData);
            this.providerStore.createProviders(providers);
            modules.push({
              id: module.id,
              importedItems: providers.length,
              status: 'imported',
            });
          }
        } catch {
          modules.push(failedModule(module.id));
        }
      }

      return { modules };
    } finally {
      await reader.close();
    }
  }
}
