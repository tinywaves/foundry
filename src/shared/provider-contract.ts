export const providerIpcChannels = {
  list: 'providers:list',
  getForEdit: 'providers:get-for-edit',
  getAvatar: 'providers:get-avatar',
  selectAvatar: 'providers:select-avatar',
  create: 'providers:create',
  update: 'providers:update',
  delete: 'providers:delete',
  revealApiKey: 'providers:reveal-api-key',
  copyApiKey: 'providers:copy-api-key',
  testSavedConnection: 'providers:test-saved-connection',
  testDraftConnection: 'providers:test-draft-connection',
} as const;

export const providerRuntimes = ['codex', 'claude-code'] as const;
export type ProviderRuntime = typeof providerRuntimes[number];

export const providerSources = ['user-custom', 'foundry-built-in'] as const;
export type ProviderSource = typeof providerSources[number];

export const providerConnectionStatuses = ['never-tested', 'connected', 'failed'] as const;
export type ProviderConnectionStatus = typeof providerConnectionStatuses[number];

export const providerAvatarMimeTypes = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type ProviderAvatarMimeType = typeof providerAvatarMimeTypes[number];

export interface ProviderAvatar {
  mimeType: ProviderAvatarMimeType;
  bytes: Uint8Array;
}

export interface ProviderAvatarSelection {
  fileName: string;
  avatar: ProviderAvatar;
}

export interface CodexModelConfigV1 {
  version: 1;
  defaultModel: string;
}

export interface ClaudeCodeModelMapping {
  displayName: string;
  requestModel: string;
}

export interface ClaudeCodeModelConfigV1 {
  version: 1;
  sonnet: ClaudeCodeModelMapping;
  opus: ClaudeCodeModelMapping;
  fable: ClaudeCodeModelMapping;
  haiku: ClaudeCodeModelMapping;
  subagent: {
    requestModel: string;
  };
  defaultFallbackModel: string;
}

export type ProviderModelConfig = CodexModelConfigV1 | ClaudeCodeModelConfigV1;

export interface ProviderConnectionSummary {
  status: ProviderConnectionStatus;
  lastTestedAt: number | null;
  lastError: string | null;
}

export interface ProviderConnectionTestInput {
  runtime: ProviderRuntime;
  baseUrl: string;
  apiKey: string | null;
}

export interface ProviderSummary {
  id: string;
  runtime: ProviderRuntime;
  source: ProviderSource;
  name: string;
  baseUrl: string;
  remark: string | null;
  officialWebsite: string | null;
  hasApiKey: boolean;
  apiKeySuffix: string | null;
  hasCustomAvatar: boolean;
  connection: ProviderConnectionSummary;
  createdAt: number;
  updatedAt: number;
}

export type ProviderDetail
  = | ProviderSummary & {
    runtime: 'codex';
    apiKey: string | null;
    modelConfig: CodexModelConfigV1;
  }
  | ProviderSummary & {
    runtime: 'claude-code';
    apiKey: string | null;
    modelConfig: ClaudeCodeModelConfigV1;
  };

interface ProviderInputBase {
  name: string;
  baseUrl: string;
  apiKey: string | null;
  remark: string | null;
  officialWebsite: string | null;
  avatar?: ProviderAvatar | null;
}

export type CreateProviderInput
  = | ProviderInputBase & {
    runtime: 'codex';
    modelConfig: CodexModelConfigV1;
  }
  | ProviderInputBase & {
    runtime: 'claude-code';
    modelConfig: ClaudeCodeModelConfigV1;
  };

export type UpdateProviderInput
  = CreateProviderInput & { id: string };

export type ProviderApiErrorCode
  = | 'invalid-input'
    | 'not-found'
    | 'conflict'
    | 'storage-unavailable'
    | 'storage-corrupt'
    | 'unsupported-database-version'
    | 'internal';

export interface ProviderFieldError {
  field: string;
  message: string;
}

export interface ProviderApiError {
  code: ProviderApiErrorCode;
  message: string;
  fields?: ProviderFieldError[];
}

export type ProviderApiResult<T>
  = | { ok: true; value: T }
    | { ok: false; error: ProviderApiError };

export type FoundryPlatform = 'darwin' | 'linux' | 'win32';

export interface ProviderApi {
  listProviders: (runtime: ProviderRuntime) => Promise<ProviderApiResult<ProviderSummary[]>>;
  getProviderForEdit: (id: string) => Promise<ProviderApiResult<ProviderDetail>>;
  getProviderAvatar: (id: string) => Promise<ProviderApiResult<ProviderAvatar | null>>;
  selectProviderAvatar: () => Promise<ProviderApiResult<ProviderAvatarSelection | null>>;
  createProvider: (input: CreateProviderInput) => Promise<ProviderApiResult<ProviderSummary>>;
  updateProvider: (input: UpdateProviderInput) => Promise<ProviderApiResult<ProviderSummary>>;
  deleteProvider: (id: string) => Promise<ProviderApiResult<undefined>>;
  revealProviderApiKey: (id: string) => Promise<ProviderApiResult<string | null>>;
  copyProviderApiKey: (id: string) => Promise<ProviderApiResult<undefined>>;
  testSavedProviderConnection: (id: string) => Promise<ProviderApiResult<ProviderSummary>>;
  testDraftProviderConnection: (
    input: ProviderConnectionTestInput,
  ) => Promise<ProviderApiResult<ProviderConnectionSummary>>;
}

export interface FoundryApi {
  platform: FoundryPlatform;
  providers: ProviderApi;
}
