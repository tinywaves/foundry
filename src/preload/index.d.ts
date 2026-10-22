import type { ElectronAPI } from '@electron-toolkit/preload';
import type { BaseApi, ProviderApi, SettingsApi } from './api';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      base: BaseApi;
      providers: ProviderApi;
      settings: SettingsApi;
    };
  }
}
