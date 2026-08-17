export const settingsIpcChannels = {
  get: 'settings:get',
  updateColorMode: 'settings:update-color-mode',
} as const;

export const applicationColorModes = ['light', 'dark', 'system'] as const;
export type ApplicationColorMode = typeof applicationColorModes[number];

export interface ApplicationSettings {
  colorMode: ApplicationColorMode;
}

export type SettingsApiErrorCode
  = | 'invalid-input'
    | 'storage-unavailable'
    | 'storage-corrupt'
    | 'unsupported-database-version'
    | 'internal';

export interface SettingsApiError {
  code: SettingsApiErrorCode;
  message: string;
}

export type SettingsApiResult<T>
  = | { ok: true; value: T }
    | { ok: false; error: SettingsApiError };

export interface SettingsApi {
  getApplicationSettings: () => Promise<SettingsApiResult<ApplicationSettings>>;
  updateApplicationColorMode: (
    colorMode: ApplicationColorMode,
  ) => Promise<SettingsApiResult<ApplicationSettings>>;
}
