import process from 'node:process';
import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import type { CaptureApi, ProviderApi, SettingsApi } from './api';
import type { ScrapeJobFinishedEvent } from '../shared/captures';

const captureSubscriptionState = { nextId: 0 };
const captureSubscriptions = new Map<
  number,
  (event: IpcRendererEvent, payload: ScrapeJobFinishedEvent) => void
>();

// Custom APIs for renderer
const api: { captures: CaptureApi; providers: ProviderApi; settings: SettingsApi } = {
  captures: {
    listCaptures: (filter) => ipcRenderer.invoke('captures:list', filter),
    countCaptures: () => ipcRenderer.invoke('captures:count'),
    getCapture: (captureId) => ipcRenderer.invoke('captures:get', captureId),
    createCapture: (input) => ipcRenderer.invoke('captures:create', input),
    recapture: (captureId) => ipcRenderer.invoke('captures:recapture', captureId),
    deleteCapture: (captureId) => ipcRenderer.invoke('captures:delete', captureId),
    updateNote: (captureId, userNote) => ipcRenderer.invoke('captures:update-note', captureId, userNote),
    listJobs: (captureId) => ipcRenderer.invoke('captures:jobs:list', captureId),
    onScrapeJobFinished: (listener) => {
      const subscriptionId = captureSubscriptionState.nextId;
      captureSubscriptionState.nextId += 1;
      const handler = (_event: IpcRendererEvent, payload: ScrapeJobFinishedEvent) => {
        listener(payload);
      };
      captureSubscriptions.set(subscriptionId, handler);
      ipcRenderer.on('captures:scrape-job-finished', handler);
      return subscriptionId;
    },
    offScrapeJobFinished: (subscriptionId) => {
      const handler = captureSubscriptions.get(subscriptionId);
      if (!handler) {
        return;
      }
      ipcRenderer.removeListener('captures:scrape-job-finished', handler);
      captureSubscriptions.delete(subscriptionId);
    },
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    getConfigFolder: () => ipcRenderer.invoke('settings:get-config-folder'),
    setTheme: (theme) => ipcRenderer.invoke('settings:set-theme', theme),
    setLanguage: (language) => ipcRenderer.invoke('settings:set-language', language),
    setTimeFormat: (timeFormat) => ipcRenderer.invoke('settings:set-time-format', timeFormat),
    setTimezone: (timezone) => ipcRenderer.invoke('settings:set-timezone', timezone),
    setLibrary: (patch) => ipcRenderer.invoke('settings:set-library', patch),
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
