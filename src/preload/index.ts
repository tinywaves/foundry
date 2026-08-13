import { contextBridge, ipcRenderer } from 'electron';
import process from 'node:process';
import type { FoundryApi, FoundryPlatform } from '../shared/foundry-contract';
import type {
  ProviderApi,
  ProviderApiResult,
} from '../shared/provider-contract';
import { providerIpcChannels } from '../shared/provider-contract';
import type { RuntimeApi, RuntimeApiResult } from '../shared/runtime-contract';
import { runtimeIpcChannels } from '../shared/runtime-contract';

type ProviderIpcChannel = typeof providerIpcChannels[keyof typeof providerIpcChannels];
type RuntimeIpcChannel = typeof runtimeIpcChannels[keyof typeof runtimeIpcChannels];
const foundryPlatforms = new Set<FoundryPlatform>(['darwin', 'linux', 'win32']);

function getFoundryPlatform(): FoundryPlatform {
  if (foundryPlatforms.has(process.platform as FoundryPlatform)) {
    return process.platform as FoundryPlatform;
  }
  throw new Error('Unsupported Electron platform.');
}

function invokeProvider<T>(channel: ProviderIpcChannel, argument: unknown): Promise<ProviderApiResult<T>> {
  return ipcRenderer.invoke(channel, argument) as Promise<ProviderApiResult<T>>;
}

const providers: ProviderApi = {
  listProviders: (runtime) => invokeProvider(providerIpcChannels.list, runtime),
  getProviderForEdit: (id) => invokeProvider(providerIpcChannels.getForEdit, id),
  getProviderAvatar: (id) => invokeProvider(providerIpcChannels.getAvatar, id),
  selectProviderAvatar: () => invokeProvider(providerIpcChannels.selectAvatar, undefined),
  createProvider: (input) => invokeProvider(providerIpcChannels.create, input),
  updateProvider: (input) => invokeProvider(providerIpcChannels.update, input),
  deleteProvider: (id) => invokeProvider(providerIpcChannels.delete, id),
  revealProviderApiKey: (id) => invokeProvider(providerIpcChannels.revealApiKey, id),
  copyProviderApiKey: (id) => invokeProvider(providerIpcChannels.copyApiKey, id),
  testSavedProviderConnection: (id) => invokeProvider(providerIpcChannels.testSavedConnection, id),
  testDraftProviderConnection: (input) => invokeProvider(
    providerIpcChannels.testDraftConnection,
    input,
  ),
};

function invokeRuntime<T>(
  channel: RuntimeIpcChannel,
  argument?: unknown,
): Promise<RuntimeApiResult<T>> {
  return ipcRenderer.invoke(channel, argument) as Promise<RuntimeApiResult<T>>;
}

const runtimes: RuntimeApi = {
  listRuntimes: () => invokeRuntime(runtimeIpcChannels.list),
  previewRuntimeConfiguration: (input) => invokeRuntime(
    runtimeIpcChannels.previewConfiguration,
    input,
  ),
  applyRuntimeConfiguration: (input) => invokeRuntime(
    runtimeIpcChannels.applyConfiguration,
    input,
  ),
  getChatGptApplicationState: () => invokeRuntime(
    runtimeIpcChannels.getChatGptApplicationState,
  ),
  restartChatGptApplication: () => invokeRuntime(
    runtimeIpcChannels.restartChatGptApplication,
  ),
};

const api: FoundryApi = {
  platform: getFoundryPlatform(),
  providers,
  runtimes,
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  // eslint-disable-next-line unicorn/no-global-object-property-assignment
  globalThis.api = api;
}
