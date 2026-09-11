import type {
  CreateProviderRequest,
  Prompt,
  Provider,
  ProviderRuntime,
} from '@dhzh/foundry-api-contract';
import { TextWriter, Uint8ArrayReader, ZipReader } from '@zip.js/zip.js';
import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';

import { FoundryExportService } from '../src/server/data-export/service';
import type { PromptStore } from '../src/server/prompts/store';
import type { ProviderStore } from '../src/server/providers/store';
import type { SettingsStore } from '../src/server/settings/store';

const codexProvider: Provider = {
  avatar: null,
  configuration: {
    apiKey: 'codex-secret',
    baseUrl: 'https://codex.example.com/v1',
    defaultModel: 'codex-model',
    protocol: 'responses',
    reviewModel: null,
  },
  createdAt: 100,
  id: 'codex-provider-id',
  name: 'Codex Provider',
  officialWebsite: 'https://codex.example.com',
  remark: 'Codex remark',
  runtime: 'codex',
  updatedAt: 200,
};

const claudeProvider: Provider = {
  avatar: null,
  configuration: {
    apiKey: 'claude-secret',
    apiKeyHeader: 'authorization',
    baseUrl: 'https://claude.example.com',
    defaultModel: 'claude-model',
    disableAutoUpdater: false,
    enableToolSearch: false,
    fableModel: null,
    haikuModel: null,
    hideAiAttribution: false,
    maxEffortThinking: false,
    opusModel: null,
    protocol: 'messages',
    sonnetModel: null,
    subagentModel: null,
    subagentModelForce: false,
    teammatesMode: false,
  },
  createdAt: 300,
  id: 'claude-provider-id',
  name: 'Claude Provider',
  officialWebsite: null,
  remark: null,
  runtime: 'claude-code',
  updatedAt: 400,
};

const prompt: Prompt = {
  content: '# Review\n\nCheck the current diff.',
  createdAt: 500,
  description: 'A review checklist',
  id: 'prompt-id',
  title: 'Review changes',
  updatedAt: 600,
};

function createPromptStore(): PromptStore {
  return {
    createPrompt: vi.fn(),
    createPrompts: vi.fn(),
    deletePrompt: vi.fn(),
    getPrompt: vi.fn(),
    listAllPrompts: () => [prompt],
    listPrompts: vi.fn(),
    updatePrompt: vi.fn(),
  };
}

function createProviderStore(): ProviderStore {
  const providers = [codexProvider, claudeProvider];

  return {
    copyProvider: vi.fn(),
    createProvider: vi.fn(),
    createProviders: vi.fn(),
    deleteProvider: vi.fn(),
    getProvider: vi.fn(),
    listProviders: (runtime: ProviderRuntime) => providers.filter(
      (provider) => provider.runtime === runtime,
    ),
    updateProvider: vi.fn(),
  };
}

function createSettingsStore(): SettingsStore {
  return {
    getApplicationSettings: () => ({ colorMode: 'dark' }),
    updateApplicationSettings: vi.fn(),
  };
}

async function readArchive(content: Uint8Array): Promise<Record<string, unknown>> {
  const reader = new ZipReader(new Uint8ArrayReader(content));

  try {
    const files: Record<string, unknown> = {};
    const entries = await reader.getEntries();
    for (const entry of entries) {
      if (!entry.directory) {
        files[entry.filename] = JSON.parse(await entry.getData(new TextWriter()));
      }
    }
    return files;
  } finally {
    await reader.close();
  }
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

it('creates a versioned Foundry Export with portable Providers and Prompts', async () => {
  const createdAt = new Date(2026, 8, 8, 12, 34, 56);
  const exported = await new FoundryExportService(
    createPromptStore(),
    createProviderStore(),
    createSettingsStore(),
    () => createdAt,
    '9.9.9',
  ).createExport();
  const archive = await readArchive(exported.content);
  const settings = { colorMode: 'dark' };
  const providers: CreateProviderRequest[] = [
    {
      avatar: codexProvider.avatar,
      name: codexProvider.name,
      officialWebsite: codexProvider.officialWebsite,
      remark: codexProvider.remark,
      configuration: codexProvider.configuration,
      runtime: codexProvider.runtime,
    },
    {
      avatar: claudeProvider.avatar,
      name: claudeProvider.name,
      officialWebsite: claudeProvider.officialWebsite,
      remark: claudeProvider.remark,
      configuration: claudeProvider.configuration,
      runtime: claudeProvider.runtime,
    },
  ];
  const prompts = [
    {
      content: prompt.content,
      description: prompt.description,
      title: prompt.title,
    },
  ];

  expect(exported.content.slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4B]));
  expect(exported.filename).toBe('foundry-export-2026-09-08T123456.foundry');
  expect(archive).toEqual({
    'manifest.json': {
      createdAt: createdAt.toISOString(),
      format: 'foundry-export-v1',
      foundryVersion: '9.9.9',
      modules: [
        {
          id: 'settings',
          mediaType: 'application/json',
          overwrite: true,
          path: 'modules/settings.json',
          sha256: sha256(settings),
          size: JSON.stringify(settings).length,
        },
        {
          id: 'providers',
          mediaType: 'application/json',
          overwrite: false,
          path: 'modules/providers.json',
          sha256: sha256(providers),
          size: JSON.stringify(providers).length,
        },
        {
          id: 'prompts',
          mediaType: 'application/json',
          overwrite: false,
          path: 'modules/prompts.json',
          sha256: sha256(prompts),
          size: JSON.stringify(prompts).length,
        },
      ],
    },
    'modules/prompts.json': prompts,
    'modules/providers.json': providers,
    'modules/settings.json': settings,
  });
  expect(JSON.stringify(archive['modules/providers.json'])).not.toContain('provider-id');
  expect(JSON.stringify(archive['modules/providers.json'])).not.toContain('createdAt');
  expect(JSON.stringify(archive['modules/providers.json'])).not.toContain('updatedAt');
  expect(JSON.stringify(archive['modules/providers.json'])).toContain('codex-secret');
  expect(JSON.stringify(archive['modules/providers.json'])).toContain('claude-secret');
  expect(JSON.stringify(archive['modules/prompts.json'])).not.toContain('prompt-id');
});

it('fails the complete export when an Export Module cannot be read', async () => {
  const settingsStore = createSettingsStore();
  settingsStore.getApplicationSettings = () => {
    throw new Error('Settings unavailable');
  };

  await expect(new FoundryExportService(
    createPromptStore(),
    createProviderStore(),
    settingsStore,
  ).createExport()).rejects.toThrow('Settings unavailable');
});
