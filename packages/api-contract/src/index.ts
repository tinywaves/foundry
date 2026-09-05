export const apiStatusCodes = {
  providerNotFound: 'PROVIDER_NOT_FOUND',
  runtimeApplyFailed: 'RUNTIME_APPLY_FAILED',
  runtimeConfigurationChanged: 'RUNTIME_CONFIGURATION_CHANGED',
  runtimeConfigurationInvalid: 'RUNTIME_CONFIGURATION_INVALID',
  runtimeNotDetected: 'RUNTIME_NOT_DETECTED',
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

export const providerRuntimes = ['codex', 'claude-code'] as const;

export type ProviderRuntime = typeof providerRuntimes[number];

export const providerAvatarMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const;

export type ProviderAvatarMimeType = typeof providerAvatarMimeTypes[number];

export const claudeApiKeyHeaders = ['authorization', 'x-api-key'] as const;

export type ClaudeApiKeyHeader = typeof claudeApiKeyHeaders[number];

export const claudeModelCapabilities = [
  'effort',
  'xhigh_effort',
  'max_effort',
  'thinking',
  'adaptive_thinking',
  'interleaved_thinking',
] as const;

export type ClaudeModelCapability = typeof claudeModelCapabilities[number];

export interface ProviderAvatar {
  data: string;
  mimeType: ProviderAvatarMimeType;
}

export interface ClaudeModelConfiguration {
  description: string | null;
  displayName: string | null;
  model: string;
  supportedCapabilities: ClaudeModelCapability[];
}

export interface CodexProviderConfiguration {
  apiKey: string | null;
  baseUrl: string;
  primaryModel: string;
  protocol: 'responses';
  reviewModel: string | null;
}

export interface ClaudeCodeProviderConfiguration {
  apiKey: string;
  apiKeyHeader: ClaudeApiKeyHeader;
  baseUrl: string;
  fableModel: ClaudeModelConfiguration | null;
  haikuModel: ClaudeModelConfiguration | null;
  opusModel: ClaudeModelConfiguration | null;
  primaryModel: ClaudeModelConfiguration;
  protocol: 'messages';
  sonnetModel: ClaudeModelConfiguration | null;
  subagentModel: string | null;
}

interface ProviderBase {
  avatar: ProviderAvatar | null;
  createdAt: number;
  id: string;
  name: string;
  officialWebsite: string | null;
  remark: string | null;
  updatedAt: number;
}

export type Provider
  = | ProviderBase & {
    configuration: CodexProviderConfiguration;
    runtime: 'codex';
  }
  | ProviderBase & {
    configuration: ClaudeCodeProviderConfiguration;
    runtime: 'claude-code';
  };

interface CreateProviderBase {
  avatar: ProviderAvatar | null;
  name: string;
  officialWebsite: string | null;
  remark: string | null;
}

export type CreateProviderRequest
  = | CreateProviderBase & {
    configuration: CodexProviderConfiguration;
    runtime: 'codex';
  }
  | CreateProviderBase & {
    configuration: ClaudeCodeProviderConfiguration;
    runtime: 'claude-code';
  };

export type ProviderResponse = ApiResponse<Provider>;

export type ProvidersResponse = ApiResponse<Provider[]>;

export const runtimeDetectionStatuses = [
  'detected',
  'not-detected',
  'failed',
] as const;

export type RuntimeDetectionStatus = typeof runtimeDetectionStatuses[number];

export interface RuntimeDetection {
  configurationExists: boolean;
  configurationPath: string;
  executablePath: string | null;
  message: string | null;
  status: RuntimeDetectionStatus;
  version: string | null;
}

export interface RuntimeAssignment {
  appliedAt: number | null;
  managed: boolean;
  providerId: string | null;
  runtime: ProviderRuntime;
}

export interface RuntimeSummary extends RuntimeAssignment {
  detection: RuntimeDetection;
}

export type RuntimesResponse = ApiResponse<RuntimeSummary[]>;

export type RuntimeConfigurationTarget
  = | { kind: 'official-default' }
    | { kind: 'provider'; providerId: string };

export interface PreviewRuntimeConfigurationRequest {
  providerKey?: string;
  target: RuntimeConfigurationTarget;
}

export type RuntimeConfigurationPreviewOperation
  = 'add'
    | 'remove'
    | 'unchanged'
    | 'update';

export type RuntimeConfigurationPreviewValue
  = | { kind: 'absent' }
    | { kind: 'plain'; value: string }
    | { kind: 'secret'; value: string };

export interface RuntimeConfigurationPreviewField {
  current: RuntimeConfigurationPreviewValue;
  key: string;
  operation: RuntimeConfigurationPreviewOperation;
  proposed: RuntimeConfigurationPreviewValue;
}

export interface RuntimeConfigurationFilePreview {
  exists: boolean;
  hash: string;
  path: string;
}

export type RuntimeConfigurationPreview
  = | {
    file: RuntimeConfigurationFilePreview;
    kind: 'provider-key-selection';
    providerKeys: string[];
    runtime: 'codex';
    target: Extract<RuntimeConfigurationTarget, { kind: 'provider' }>;
  }
  | {
    changes: RuntimeConfigurationPreviewField[];
    file: RuntimeConfigurationFilePreview;
    kind: 'ready';
    providerKey: string | null;
    runtime: ProviderRuntime;
    target: RuntimeConfigurationTarget;
    unchanged: RuntimeConfigurationPreviewField[];
  };

export type RuntimeConfigurationPreviewResponse
  = ApiResponse<RuntimeConfigurationPreview | null>;

export interface ApplyRuntimeConfigurationRequest {
  expectedFileHash: string;
  providerKey?: string;
  target: RuntimeConfigurationTarget;
}

export type RuntimeConfigurationApplyResponse = ApiResponse<RuntimeSummary | null>;
