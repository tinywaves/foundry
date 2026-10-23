import process from 'node:process';
import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import type { BaseApi, ProviderApi, SettingsApi } from './api';
import type { ScrapeJobFinishedEvent } from '../shared/base';

const baseSubscriptionState = { nextId: 0 };
const baseSubscriptions = new Map<
  number,
  (event: IpcRendererEvent, payload: ScrapeJobFinishedEvent) => void
>();

// Custom APIs for renderer
const api: { base: BaseApi; providers: ProviderApi; settings: SettingsApi } = {
  base: {
    listCaptures: (filter) => ipcRenderer.invoke('base:captures:list', filter),
    createCapture: (input) => ipcRenderer.invoke('base:captures:create', input),
    recapture: (captureId) => ipcRenderer.invoke('base:captures:recapture', captureId),
    deleteCapture: (captureId) => ipcRenderer.invoke('base:captures:delete', captureId),
    updateNote: (captureId, userNote) => ipcRenderer.invoke('base:captures:update-note', captureId, userNote),
    listJobs: (captureId) => ipcRenderer.invoke('base:jobs:list', captureId),
    onScrapeJobFinished: (listener) => {
      const subscriptionId = baseSubscriptionState.nextId;
      baseSubscriptionState.nextId += 1;
      const handler = (_event: IpcRendererEvent, payload: ScrapeJobFinishedEvent) => {
        listener(payload);
      };
      baseSubscriptions.set(subscriptionId, handler);
      ipcRenderer.on('base:scrape-job-finished', handler);
      return subscriptionId;
    },
    offScrapeJobFinished: (subscriptionId) => {
      const handler = baseSubscriptions.get(subscriptionId);
      if (!handler) {
        return;
      }
      ipcRenderer.removeListener('base:scrape-job-finished', handler);
      baseSubscriptions.delete(subscriptionId);
    },
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    getConfigFolder: () => ipcRenderer.invoke('settings:get-config-folder'),
    setTheme: (theme) => ipcRenderer.invoke('settings:set-theme', theme),
    setLanguage: (language) => ipcRenderer.invoke('settings:set-language', language),
    setTimeFormat: (timeFormat) => ipcRenderer.invoke('settings:set-time-format', timeFormat),
    setTimezone: (timezone) => ipcRenderer.invoke('settings:set-timezone', timezone),
    setBase: (patch) => ipcRenderer.invoke('settings:set-base', patch),
    openConfigFolder: () => ipcRenderer.invoke('settings:open-config-folder'),
  },
  providers: {
    list: () => ipcRenderer.invoke('providers:list'),
    get: (id) => ipcRenderer.invoke('providers:get', id),
    save: (input, id) => ipcRenderer.invoke('providers:save', input, id),
    setStatus: (id, status) => ipcRenderer.invoke('providers:set-status', id, status),
    fetchModels: (id) => ipcRenderer.invoke('providers:fetch-models', id),
    fetchModelsForInput: (input) => ipcRenderer.invoke('providers:fetch-models-input', input),
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  // eslint-disable-next-line unicorn/no-global-object-property-assignment
  globalThis.electron = electronAPI;
  // @ts-ignore (define in dts)
  // eslint-disable-next-line unicorn/no-global-object-property-assignment
  globalThis.api = api;
}
