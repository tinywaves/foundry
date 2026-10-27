import type { ElectronAPI } from '@electron-toolkit/preload';
import type {
  CaptureApi,
  DataTransferApi,
  ProviderApi,
  SettingsApi,
} from './api';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      captures: CaptureApi;
      dataTransfer: DataTransferApi;
      providers: ProviderApi;
      settings: SettingsApi;
    };
  }
}
