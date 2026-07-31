import { contextBridge } from 'electron';
import process from 'node:process';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {};

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
