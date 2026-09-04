export const apiStatusCodes = {
  success: 'SUCCESS',
} as const;

export type ApiStatusCode = typeof apiStatusCodes[keyof typeof apiStatusCodes];

export interface ApiResponse<TData> {
  data: TData;
  message?: string;
  status: ApiStatusCode;
}

export type HealthResponse = ApiResponse<true>;

export const applicationColorModes = ['system', 'light', 'dark'] as const;

export type ApplicationColorMode = typeof applicationColorModes[number];

export interface ApplicationSettings {
  colorMode: ApplicationColorMode;
}

export interface UpdateApplicationSettingsRequest {
  colorMode: ApplicationColorMode;
}

export type SettingsResponse = ApiResponse<ApplicationSettings>;
