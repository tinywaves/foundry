export const apiStatusCodes = {
  promptNotFound: 'PROMPT_NOT_FOUND',
  providerConnectionFailed: 'PROVIDER_CONNECTION_FAILED',
  providerInUse: 'PROVIDER_IN_USE',
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

export const foundryExportFormat = 'foundry-export-v1' as const;

export const foundryExportMediaType = 'application/octet-stream' as const;

export const foundryExportModuleIds = ['settings', 'providers', 'prompts'] as const;

export type FoundryExportModuleId = typeof foundryExportModuleIds[number];

export interface FoundryExportModuleManifest {
  id: FoundryExportModuleId;
  mediaType: 'application/json';
  overwrite: boolean;
  path: string;
  sha256: string;
  size: number;
}

export interface FoundryExportManifest {
  createdAt: string;
  format: typeof foundryExportFormat;
  foundryVersion: string;
  modules: FoundryExportModuleManifest[];
}

export type FoundryImportModuleStatus = 'failed' | 'imported' | 'unsupported';

export interface FoundryImportModuleResult {
  id: string;
  importedItems: number;
  message?: string;
  status: FoundryImportModuleStatus;
}

export interface FoundryImportResult {
  modules: FoundryImportModuleResult[];
}

export type FoundryImportResponse = ApiResponse<FoundryImportResult>;

export type FoundryImportModuleInspectionStatus
  = 'available' | 'invalid' | 'unsupported';

export interface FoundryImportModuleInspection {
  id: string;
  itemCount: number | null;
  message?: string;
  overwrite: boolean;
  status: FoundryImportModuleInspectionStatus;
}

export interface FoundryImportInspection {
  createdAt: string;
  foundryVersion: string;
  modules: FoundryImportModuleInspection[];
}

export type FoundryImportInspectionResponse = ApiResponse<FoundryImportInspection>;

export const providerRuntimes = ['codex', 'claude-code'] as const;

export type ProviderRuntime = typeof providerRuntimes[number];

export const providerRuntimeLabels = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
} as const satisfies Record<ProviderRuntime, string>;

export const runtimeManagedFieldReferences = {
  'claude-code': [
    'env.ANTHROPIC_BASE_URL',
    'env.ANTHROPIC_AUTH_TOKEN',
    'env.ANTHROPIC_API_KEY',
    'env.ANTHROPIC_MODEL',
    'env.ANTHROPIC_DEFAULT_OPUS_MODEL',
    'env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
    'env.ANTHROPIC_DEFAULT_SONNET_MODEL',
    'env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES',
    'env.ANTHROPIC_DEFAULT_HAIKU_MODEL',
    'env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES',
    'env.ANTHROPIC_DEFAULT_FABLE_MODEL',
    'env.ANTHROPIC_DEFAULT_FABLE_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION',
    'env.ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES',
    'env.CLAUDE_CODE_SUBAGENT_MODEL',
    'env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE',
    'env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS',
    'env.ENABLE_TOOL_SEARCH',
    'env.CLAUDE_CODE_EFFORT_LEVEL',
    'env.DISABLE_AUTOUPDATER',
    'attribution.commit',
    'attribution.pr',
    'attribution.sessionUrl',
  ],
  'codex': [
    'model',
    'review_model',
    'model_provider',
    '[model_providers.<key>].name',
    '[model_providers.<key>].base_url',
    '[model_providers.<key>].wire_api',
    '[model_providers.<key>].experimental_bearer_token',
  ],
} as const satisfies Record<ProviderRuntime, readonly string[]>;

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
  defaultModel: string;
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
  defaultModel: string;
  protocol: 'messages';
  sonnetModel: ClaudeModelConfiguration | null;
  subagentModel: string | null;
  subagentModelForce: boolean;
  hideAiAttribution: boolean;
  teammatesMode: boolean;
  enableToolSearch: boolean;
  maxEffortThinking: boolean;
  disableAutoUpdater: boolean;
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

export interface ProviderSummary {
  avatar: ProviderAvatar | null;
  baseUrl: string;
  id: string;
  name: string;
  officialWebsite: string | null;
  remark: string | null;
  runtime: ProviderRuntime;
}

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

export type FoundrySettingsExport = ApplicationSettings;

export type FoundryProvidersExport = CreateProviderRequest[];

export interface CreatePromptRequest {
  content: string;
  description: string | null;
  title: string;
}

export interface Prompt extends CreatePromptRequest {
  createdAt: number;
  id: string;
  updatedAt: number;
}

export interface PromptSummary {
  createdAt: number;
  description: string | null;
  excerpt: string;
  id: string;
  title: string;
  updatedAt: number;
}

export interface PromptList {
  items: PromptSummary[];
}

export type FoundryPromptsExport = CreatePromptRequest[];

export type PromptResponse = ApiResponse<PromptSummary>;

export type PromptDetailResponse = ApiResponse<Prompt | null>;

export type PromptDeleteResponse = ApiResponse<boolean>;

export type PromptUpdateResponse = ApiResponse<PromptSummary | null>;

export type PromptsResponse = ApiResponse<PromptList>;

export type ProviderResponse = ApiResponse<ProviderSummary>;

export type ProviderDetailResponse = ApiResponse<Provider | null>;

export type ProviderCopyResponse = ApiResponse<ProviderSummary | null>;

export type ProviderDeleteResponse = ApiResponse<boolean>;

export type ProviderConnectionTestResponse = ApiResponse<boolean>;

export type ProviderUpdateResponse = ApiResponse<ProviderSummary | null>;

export type ProvidersResponse = ApiResponse<ProviderSummary[]>;

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
