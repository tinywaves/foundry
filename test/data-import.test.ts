import type { CreateProviderRequest } from '@dhzh/foundry-api-contract';
import {
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipWriter,
} from '@zip.js/zip.js';
import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';

import {
  FoundryImportFileError,
  FoundryImportService,
} from '../src/server/data-import/service';
import type { ProviderStore } from '../src/server/providers/store';
import type { SettingsStore } from '../src/server/settings/store';

interface TestModule {
  data: unknown;
  id: string;
  overwrite: boolean;
  path: string;
  sha256?: string;
}

const codexProvider = {
  avatar: null,
  configuration: {
    apiKey: 'codex-secret',
    baseUrl: 'https://codex.example.com/v1',
    defaultModel: 'codex-model',
    protocol: 'responses',
    reviewModel: null,
  },
  name: 'Imported Provider',
  officialWebsite: 'https://codex.example.com',
  remark: null,
  runtime: 'codex',
} satisfies CreateProviderRequest;

async function createArchive(modules: TestModule[]): Promise<Uint8Array<ArrayBuffer>> {
  const encoder = new TextEncoder();
  const payloads = modules.map((module) => {
    const content = encoder.encode(JSON.stringify(module.data));
    return { content, module };
  });
  const manifest = {
    createdAt: '2026-09-08T12:34:56.000Z',
    format: 'foundry-export-v1',
    foundryVersion: '9.9.9',
    modules: payloads.map(({ content, module }) => ({
      id: module.id,
      mediaType: 'application/json',
      overwrite: module.overwrite,
      path: module.path,
      sha256: module.sha256
        ?? createHash('sha256').update(content).digest('hex'),
      size: content.byteLength,
    })),
  };
  const writer = new ZipWriter(new Uint8ArrayWriter());
  const manifestJson = JSON.stringify(manifest);
  const manifestContent = encoder.encode(manifestJson);

  await writer.add(
    'manifest.json',
    new Uint8ArrayReader(manifestContent),
  );
  for (const { content, module } of payloads) {
    await writer.add(module.path, new Uint8ArrayReader(content));
  }
  return writer.close();
}

function createStores(options: { failProviders?: boolean } = {}) {
  const providerStore: ProviderStore = {
    copyProvider: vi.fn(),
    createProvider: vi.fn(),
    createProviders: vi.fn((providers: CreateProviderRequest[]) => {
      if (options.failProviders) {
        throw new Error('Database unavailable');
      }
      return providers.map((provider, index) => ({
        ...provider,
        createdAt: index,
        id: `provider-${index}`,
        updatedAt: index,
      }));
    }),
    deleteProvider: vi.fn(),
    getProvider: vi.fn(),
    listProviders: vi.fn(),
    updateProvider: vi.fn(),
  };
  const settingsStore: SettingsStore = {
    getApplicationSettings: vi.fn(() => ({ colorMode: 'system' as const })),
    updateApplicationSettings: vi.fn((settings) => settings),
  };

  return { providerStore, settingsStore };
}

function completeModules(additionalModules: TestModule[] = []): TestModule[] {
  return [
    {
      data: { colorMode: 'dark' },
      id: 'settings',
      overwrite: true,
      path: 'modules/settings.json',
    },
    {
      data: [codexProvider],
      id: 'providers',
      overwrite: false,
      path: 'modules/providers.json',
    },
    ...additionalModules,
  ];
}

it('imports Settings by replacement and Providers by atomic append', async () => {
  const stores = createStores();
  const result = await new FoundryImportService(
    stores.providerStore,
    stores.settingsStore,
  ).importData(await createArchive(completeModules()));

  expect(result).toEqual({
    modules: [
      { id: 'settings', importedItems: 1, status: 'imported' },
      { id: 'providers', importedItems: 1, status: 'imported' },
    ],
  });
  expect(stores.settingsStore.updateApplicationSettings)
    .toHaveBeenCalledWith({ colorMode: 'dark' });
  expect(stores.providerStore.createProviders).toHaveBeenCalledWith([codexProvider]);
});

it('keeps successful modules when another module cannot be imported', async () => {
  const stores = createStores({ failProviders: true });
  const result = await new FoundryImportService(
    stores.providerStore,
    stores.settingsStore,
  ).importData(await createArchive(completeModules()));

  expect(result.modules).toEqual([
    { id: 'settings', importedItems: 1, status: 'imported' },
    {
      id: 'providers',
      importedItems: 0,
      message: 'Providers could not be imported.',
      status: 'failed',
    },
  ]);
  expect(stores.settingsStore.updateApplicationSettings).toHaveBeenCalledOnce();
});

it('skips unknown modules without blocking known modules', async () => {
  const stores = createStores();
  const archive = await createArchive(completeModules([
    {
      data: { future: true },
      id: 'future-module',
      overwrite: false,
      path: 'modules/future.json',
    },
  ]));

  const result = await new FoundryImportService(
    stores.providerStore,
    stores.settingsStore,
  ).importData(archive);

  expect(result.modules).toEqual([
    { id: 'settings', importedItems: 1, status: 'imported' },
    { id: 'providers', importedItems: 1, status: 'imported' },
    {
      id: 'future-module',
      importedItems: 0,
      message: 'This Export Module is not supported by this Foundry version.',
      status: 'unsupported',
    },
  ]);
});

it('reports a checksum mismatch only against the affected module', async () => {
  const stores = createStores();
  const modules = completeModules();
  const providers = modules.find((module) => module.id === 'providers');
  if (!providers) {
    throw new Error('Providers fixture is unavailable.');
  }
  providers.sha256 = '0'.repeat(64);

  const result = await new FoundryImportService(
    stores.providerStore,
    stores.settingsStore,
  ).importData(await createArchive(modules));

  expect(result.modules[0]).toMatchObject({ id: 'settings', status: 'imported' });
  expect(result.modules[1]).toMatchObject({ id: 'providers', status: 'failed' });
  expect(stores.providerStore.createProviders).not.toHaveBeenCalled();
});

it('rejects files without a valid Foundry Export container and manifest', async () => {
  const stores = createStores();
  const service = new FoundryImportService(
    stores.providerStore,
    stores.settingsStore,
  );

  await expect(service.importData(new Uint8Array([1, 2, 3])))
    .rejects
    .toBeInstanceOf(FoundryImportFileError);
});
