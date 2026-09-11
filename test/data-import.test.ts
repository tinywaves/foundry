import type {
  CreatePromptRequest,
  CreateProviderRequest,
} from '@dhzh/foundry-api-contract';
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
import type { PromptStore } from '../src/server/prompts/store';
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

const prompt = {
  content: '# Imported\n\nKeep the exact source.',
  description: 'Imported description',
  title: 'Imported Prompt',
} satisfies CreatePromptRequest;

const legacyModuleIds = ['settings', 'providers'] as const;
const currentModuleIds = ['settings', 'providers', 'prompts'] as const;

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
  const promptStore: PromptStore = {
    createPrompt: vi.fn(),
    createPrompts: vi.fn((prompts: CreatePromptRequest[]) => prompts.map(
      (prompt, index) => ({
        ...prompt,
        createdAt: index,
        id: `prompt-${index}`,
        updatedAt: index,
      }),
    )),
    deletePrompt: vi.fn(),
    getPrompt: vi.fn(),
    listAllPrompts: vi.fn(),
    listPrompts: vi.fn(),
    updatePrompt: vi.fn(),
  };
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

  return { promptStore, providerStore, settingsStore };
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
    stores.promptStore,
    stores.providerStore,
    stores.settingsStore,
  ).importData(await createArchive(completeModules()), legacyModuleIds);

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
    stores.promptStore,
    stores.providerStore,
    stores.settingsStore,
  ).importData(await createArchive(completeModules()), legacyModuleIds);

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

it('inspects known modules and reports unknown modules as unsupported', async () => {
  const stores = createStores();
  const archive = await createArchive(completeModules([
    {
      data: { future: true },
      id: 'future-module',
      overwrite: false,
      path: 'modules/future.json',
    },
  ]));

  const service = new FoundryImportService(
    stores.promptStore,
    stores.providerStore,
    stores.settingsStore,
  );
  const result = await service.inspectData(archive);

  expect(result).toEqual({
    createdAt: '2026-09-08T12:34:56.000Z',
    foundryVersion: '9.9.9',
    modules: [
      {
        id: 'settings',
        itemCount: 1,
        overwrite: true,
        status: 'available',
      },
      {
        id: 'providers',
        itemCount: 1,
        overwrite: false,
        status: 'available',
      },
      {
        id: 'future-module',
        itemCount: null,
        message: 'This Export Module is not supported by this Foundry version.',
        overwrite: false,
        status: 'unsupported',
      },
    ],
  });
  expect(stores.settingsStore.updateApplicationSettings).not.toHaveBeenCalled();
  expect(stores.providerStore.createProviders).not.toHaveBeenCalled();
});

it('imports only the selected modules', async () => {
  const stores = createStores();
  const result = await new FoundryImportService(
    stores.promptStore,
    stores.providerStore,
    stores.settingsStore,
  ).importData(await createArchive(completeModules([
    {
      data: [prompt],
      id: 'prompts',
      overwrite: false,
      path: 'modules/prompts.json',
    },
  ])), ['prompts']);

  expect(result.modules).toEqual(
    [{ id: 'prompts', importedItems: 1, status: 'imported' }],
  );
  expect(stores.promptStore.createPrompts).toHaveBeenCalledWith([prompt]);
  expect(stores.settingsStore.updateApplicationSettings).not.toHaveBeenCalled();
  expect(stores.providerStore.createProviders).not.toHaveBeenCalled();
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
    stores.promptStore,
    stores.providerStore,
    stores.settingsStore,
  ).importData(await createArchive(modules), legacyModuleIds);

  expect(result.modules[0]).toMatchObject({ id: 'settings', status: 'imported' });
  expect(result.modules[1]).toMatchObject({ id: 'providers', status: 'failed' });
  expect(stores.providerStore.createProviders).not.toHaveBeenCalled();

  const inspection = await new FoundryImportService(
    stores.promptStore,
    stores.providerStore,
    stores.settingsStore,
  ).inspectData(await createArchive(modules));
  expect(inspection.modules[1]).toMatchObject({
    id: 'providers',
    itemCount: null,
    status: 'invalid',
  });
});

it('rejects files without a valid Foundry Export container and manifest', async () => {
  const stores = createStores();
  const service = new FoundryImportService(
    stores.promptStore,
    stores.providerStore,
    stores.settingsStore,
  );

  await expect(service.inspectData(new Uint8Array([1, 2, 3])))
    .rejects
    .toBeInstanceOf(FoundryImportFileError);
  await expect(service.importData(new Uint8Array([1, 2, 3]), legacyModuleIds))
    .rejects
    .toBeInstanceOf(FoundryImportFileError);
});

it('appends Prompts while accepting legacy exports and discarding legacy tags', async () => {
  const stores = createStores();
  const service = new FoundryImportService(
    stores.promptStore,
    stores.providerStore,
    stores.settingsStore,
  );

  const legacyResult = await service.importData(
    await createArchive(completeModules()),
    legacyModuleIds,
  );
  expect(legacyResult.modules.map((module) => module.id))
    .toEqual(['settings', 'providers']);

  const result = await service.importData(
    await createArchive(completeModules([
      {
        data: [{ ...prompt, tags: ['Imported'] }],
        id: 'prompts',
        overwrite: false,
        path: 'modules/prompts.json',
      },
    ])),
    currentModuleIds,
  );
  expect(result.modules.at(-1)).toEqual({
    id: 'prompts',
    importedItems: 1,
    status: 'imported',
  });
  expect(stores.promptStore.createPrompts).toHaveBeenCalledWith([prompt]);
});
