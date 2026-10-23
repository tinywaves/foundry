import type { ElectronAPI } from '@electron-toolkit/preload';
import type { CaptureApi, ProviderApi, SettingsApi } from './api';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      captures: CaptureApi;
      providers: ProviderApi;
      settings: SettingsApi;
    };
  }
}
