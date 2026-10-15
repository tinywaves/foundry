import type {
  CreateProviderRequest,
  FoundryExportManifest,
  FoundryExportModuleId,
  FoundryExportModuleManifest,
  FoundryProvidersExport,
  FoundryPromptsExport,
  FoundrySettingsExport,
  Provider,
} from '@dhzh/foundry-api-contract';
import {
  foundryExportFormat,
  providerRuntimes,
} from '@dhzh/foundry-api-contract';
import {
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipWriter,
} from '@zip.js/zip.js';
import { createHash } from 'node:crypto';
import packageJson from '../../../package.json' with { type: 'json' };

import type { ProviderStore } from '../providers/store';
import type { PromptStore } from '../prompts/store';
import type { SettingsStore } from '../settings/store';

const jsonEncoder = new TextEncoder();

function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

interface ExportModule {
  content: Uint8Array<ArrayBuffer>;
  manifest: FoundryExportModuleManifest;
}

export interface FoundryExportFile {
  content: Uint8Array<ArrayBuffer>;
  filename: string;
  manifest: FoundryExportManifest;
}

function toCreateProviderRequest(provider: Provider): CreateProviderRequest {
  const common = {
    avatar: provider.avatar,
    name: provider.name,
    officialWebsite: provider.officialWebsite,
    remark: provider.remark,
  };

  return provider.runtime === 'codex'
    ? {
        ...common,
        configuration: provider.configuration,
        runtime: provider.runtime,
      }
    : {
        ...common,
        configuration: provider.configuration,
        runtime: provider.runtime,
      };
}

function createJsonModule(
  id: FoundryExportModuleId,
  path: string,
  isOverwrite: boolean,
  data: unknown,
): ExportModule {
  const content = jsonEncoder.encode(JSON.stringify(data));

  return {
    content,
    manifest: {
      id,
      mediaType: 'application/json',
      overwrite: isOverwrite,
      path,
      sha256: createHash('sha256').update(content).digest('hex'),
      size: content.byteLength,
    },
  };
}

function formatFilename(date: Date): string {
  const timestamp = [
    date.getFullYear(),
    '-',
    padTwoDigits(date.getMonth() + 1),
    '-',
    padTwoDigits(date.getDate()),
    'T',
    padTwoDigits(date.getHours()),
    padTwoDigits(date.getMinutes()),
    padTwoDigits(date.getSeconds()),
  ].join('');

  return `foundry-export-${timestamp}.foundry`;
}

export class FoundryExportService {
  constructor(
    private readonly promptStore: PromptStore,
    private readonly providerStore: ProviderStore,
    private readonly settingsStore: SettingsStore,
    private readonly now: () => Date = () => new Date(),
    private readonly foundryVersion: string = packageJson.version,
  ) {}

  async createExport(): Promise<FoundryExportFile> {
    const createdAt = this.now();
    const settings = this.settingsStore.getApplicationSettings() satisfies FoundrySettingsExport;
    const providers = providerRuntimes.flatMap((runtime) =>
      this.providerStore.listProviders(runtime).map(
        (provider) => toCreateProviderRequest(provider),
      ),
    ) satisfies FoundryProvidersExport;
    const prompts = this.promptStore.listAllPrompts().map((prompt) => ({
      content: prompt.content,
      description: prompt.description,
      title: prompt.title,
    })) satisfies FoundryPromptsExport;
    const modules = [
      createJsonModule('settings', 'modules/settings.json', true, settings),
      createJsonModule('providers', 'modules/providers.json', false, providers),
      createJsonModule('prompts', 'modules/prompts.json', false, prompts),
    ];
    const manifest: FoundryExportManifest = {
      createdAt: createdAt.toISOString(),
      format: foundryExportFormat,
      foundryVersion: this.foundryVersion,
      modules: modules.map((module) => module.manifest),
    };
    const writer = new ZipWriter(new Uint8ArrayWriter());
    const manifestJson = JSON.stringify(manifest);
    const manifestContent = jsonEncoder.encode(manifestJson);

    await writer.add(
      'manifest.json',
      new Uint8ArrayReader(manifestContent),
    );
    for (const module of modules) {
      await writer.add(module.manifest.path, new Uint8ArrayReader(module.content));
    }

    return {
      content: await writer.close(),
      filename: formatFilename(createdAt),
      manifest,
    };
  }
}
