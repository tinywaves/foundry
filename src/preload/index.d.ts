import type { ElectronAPI } from '@electron-toolkit/preload';
import type { ProviderApi, SettingsApi } from './api';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      providers: ProviderApi;
      settings: SettingsApi;
    };
  }
}
