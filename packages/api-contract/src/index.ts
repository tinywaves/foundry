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
