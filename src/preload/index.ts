import process from 'node:process';
import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import type { ProviderApi, SettingsApi } from './api';

// Custom APIs for renderer
const api: { providers: ProviderApi; settings: SettingsApi } = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    setTheme: (theme) => ipcRenderer.invoke('settings:set-theme', theme),
    setLanguage: (language) => ipcRenderer.invoke('settings:set-language', language),
    setRegion: (region) => ipcRenderer.invoke('settings:set-region', region),
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
