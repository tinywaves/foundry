import { contextBridge, ipcRenderer } from 'electron';
import process from 'node:process';
import packageMetadata from '../../package.json';
import type { FoundryApi, FoundryPlatform } from '../shared/foundry-contract';
import type { PromptApi, PromptApiResult } from '../shared/prompt-contract';
import { promptIpcChannels } from '../shared/prompt-contract';
import type {
  ProviderApi,
  ProviderApiResult,
} from '../shared/provider-contract';
import { providerIpcChannels } from '../shared/provider-contract';
import type { RuntimeApi, RuntimeApiResult } from '../shared/runtime-contract';
import { runtimeIpcChannels } from '../shared/runtime-contract';
import type { SettingsApi, SettingsApiResult } from '../shared/settings-contract';
import { settingsIpcChannels } from '../shared/settings-contract';
import type { SkillApi, SkillApiResult, SkillChangedNotification } from '../shared/skill-contract';
import { skillIpcChannels } from '../shared/skill-contract';

type ProviderIpcChannel = typeof providerIpcChannels[keyof typeof providerIpcChannels];
type PromptIpcChannel = typeof promptIpcChannels[keyof typeof promptIpcChannels];
type RuntimeIpcChannel = typeof runtimeIpcChannels[keyof typeof runtimeIpcChannels];
type SettingsIpcChannel = typeof settingsIpcChannels[keyof typeof settingsIpcChannels];
type SkillIpcChannel = typeof skillIpcChannels[keyof typeof skillIpcChannels];
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

function invokePrompt<T>(
  channel: PromptIpcChannel,
  argument?: unknown,
): Promise<PromptApiResult<T>> {
  return ipcRenderer.invoke(channel, argument) as Promise<PromptApiResult<T>>;
}

const prompts: PromptApi = {
  listPrompts: () => invokePrompt(promptIpcChannels.list),
  getPrompt: (id) => invokePrompt(promptIpcChannels.get, id),
  createPrompt: (input) => invokePrompt(promptIpcChannels.create, input),
  updatePrompt: (input) => invokePrompt(promptIpcChannels.update, input),
  movePromptToTrash: (id) => invokePrompt(promptIpcChannels.moveToTrash, id),
  listPromptVersions: (id) => invokePrompt(promptIpcChannels.listVersions, id),
  getPromptVersion: (target) => invokePrompt(promptIpcChannels.getVersion, target),
  restorePromptVersion: (target) => invokePrompt(promptIpcChannels.restoreVersion, target),
  copyPrompt: (id) => invokePrompt(promptIpcChannels.copy, id),
  copyPromptVersion: (target) => invokePrompt(promptIpcChannels.copyVersion, target),
  listTrashedPrompts: () => invokePrompt(promptIpcChannels.listTrash),
  getTrashedPrompt: (id) => invokePrompt(promptIpcChannels.getTrashed, id),
  restoreTrashedPrompt: (id) => invokePrompt(promptIpcChannels.restoreTrashed, id),
  removePromptFromTrash: (id) => invokePrompt(promptIpcChannels.removeFromTrash, id),
  emptyPromptTrash: () => invokePrompt(promptIpcChannels.emptyTrash),
};

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

function invokeSettings<T>(
  channel: SettingsIpcChannel,
  argument?: unknown,
): Promise<SettingsApiResult<T>> {
  return ipcRenderer.invoke(channel, argument) as Promise<SettingsApiResult<T>>;
}

const settings: SettingsApi = {
  getApplicationSettings: () => invokeSettings(settingsIpcChannels.get),
  updateApplicationColorMode: (colorMode) => invokeSettings(
    settingsIpcChannels.updateColorMode,
    colorMode,
  ),
};

function invokeSkill<T>(
  channel: SkillIpcChannel,
  argument?: unknown,
): Promise<SkillApiResult<T>> {
  return ipcRenderer.invoke(channel, argument) as Promise<SkillApiResult<T>>;
}

const skills: SkillApi = {
  listStorePackages: () => invokeSkill(skillIpcChannels.listStorePackages),
  getStorePackage: (skillId) => invokeSkill(skillIpcChannels.getStorePackage, skillId),
  listTargets: () => invokeSkill(skillIpcChannels.listTargets),
  listInstallations: (input) => invokeSkill(skillIpcChannels.listInstallations, input),
  importExisting: () => invokeSkill(skillIpcChannels.importExisting),
  beginWatchSession: () => invokeSkill(skillIpcChannels.beginWatchSession),
  endWatchSession: (sessionId) => invokeSkill(skillIpcChannels.endWatchSession, sessionId),
  listPackageFiles: (skillId) => invokeSkill(skillIpcChannels.listPackageFiles, skillId),
  readPackageFile: (input) => invokeSkill(skillIpcChannels.readPackageFile, input),
  revealPackage: (skillId) => invokeSkill(skillIpcChannels.revealPackage, skillId),
  revealTarget: (targetId) => invokeSkill(skillIpcChannels.revealTarget, targetId),
  openTargetDocumentation: (targetId) => invokeSkill(
    skillIpcChannels.openTargetDocumentation,
    targetId,
  ),
  selectCustomTargetDirectory: () => invokeSkill(
    skillIpcChannels.selectCustomTargetDirectory,
  ),
  createCustomTarget: (input) => invokeSkill(skillIpcChannels.createCustomTarget, input),
  updateTargetPolicy: (input) => invokeSkill(skillIpcChannels.updateTargetPolicy, input),
  resetBuiltInTargetPolicy: (targetId) => invokeSkill(
    skillIpcChannels.resetBuiltInTargetPolicy,
    targetId,
  ),
  removeCustomTarget: (targetId) => invokeSkill(
    skillIpcChannels.removeCustomTarget,
    targetId,
  ),
  preflightDistribution: (input) => invokeSkill(
    skillIpcChannels.preflightDistribution,
    input,
  ),
  distribute: (input) => invokeSkill(skillIpcChannels.distribute, input),
  restoreInstallation: (input) => invokeSkill(
    skillIpcChannels.restoreInstallation,
    input,
  ),
  promoteInstallation: (input) => invokeSkill(
    skillIpcChannels.promoteInstallation,
    input,
  ),
  importInstallationAsNew: (input) => invokeSkill(
    skillIpcChannels.importInstallationAsNew,
    input,
  ),
  uninstall: (input) => invokeSkill(skillIpcChannels.uninstall, input),
  listRevisions: (skillId) => invokeSkill(skillIpcChannels.listRevisions, skillId),
  listRevisionFiles: (skillId, revisionId) => ipcRenderer.invoke(
    skillIpcChannels.listRevisionFiles,
    skillId,
    revisionId,
  ),
  readRevisionFile: (input) => invokeSkill(skillIpcChannels.readRevisionFile, input),
  movePackageToTrash: (skillId) => invokeSkill(skillIpcChannels.movePackageToTrash, skillId),
  listTrash: () => invokeSkill(skillIpcChannels.listTrash),
  restoreTrashedPackage: (skillId) => invokeSkill(
    skillIpcChannels.restoreTrashedPackage,
    skillId,
  ),
  removeTrashedPackage: (skillId) => invokeSkill(
    skillIpcChannels.removeTrashedPackage,
    skillId,
  ),
  emptyTrash: () => invokeSkill(skillIpcChannels.emptyTrash),
  listSources: (skillId) => invokeSkill(skillIpcChannels.listSources, skillId),
  browseRemoteSkills: (input) => invokeSkill(skillIpcChannels.browseRemoteSkills, input),
  searchRemoteSkills: (input) => invokeSkill(skillIpcChannels.searchRemoteSkills, input),
  getRemoteSkillDetails: (input) => invokeSkill(
    skillIpcChannels.getRemoteSkillDetails,
    input,
  ),
  resolveDirectoryResult: (input) => invokeSkill(
    skillIpcChannels.resolveDirectoryResult,
    input,
  ),
  resolveGitSource: (input) => invokeSkill(skillIpcChannels.resolveGitSource, input),
  addRemoteCandidate: (input) => invokeSkill(skillIpcChannels.addRemoteCandidate, input),
  openRemoteResult: (input) => invokeSkill(skillIpcChannels.openRemoteResult, input),
  openSource: (sourceId) => invokeSkill(skillIpcChannels.openSource, sourceId),
  checkSourceForUpdates: (sourceId) => invokeSkill(
    skillIpcChannels.checkSourceForUpdates,
    sourceId,
  ),
  checkPackageForUpdates: (skillId) => invokeSkill(
    skillIpcChannels.checkPackageForUpdates,
    skillId,
  ),
  applyUpdate: (input) => invokeSkill(skillIpcChannels.applyUpdate, input),
  onChanged: (listener) => {
    const handleChanged = (_event: unknown, notification: SkillChangedNotification) => {
      listener(notification);
    };
    ipcRenderer.on(skillIpcChannels.changed, handleChanged);
    return () => ipcRenderer.removeListener(skillIpcChannels.changed, handleChanged);
  },
};

const api: FoundryApi = {
  applicationVersion: packageMetadata.version,
  platform: getFoundryPlatform(),
  prompts,
  providers,
  runtimes,
  settings,
  skills,
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
