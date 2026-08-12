import type {
  ProviderConnectionSummary,
  ProviderRuntime,
} from './provider-contract';

export const runtimeIpcChannels = {
  list: 'runtimes:list',
  previewConfiguration: 'runtimes:preview-configuration',
  applyConfiguration: 'runtimes:apply-configuration',
} as const;

export const runtimeConfigurationChangeOperations = [
  'add',
  'update',
  'remove',
  'no-change',
] as const;

export const runtimeConfigurationPaths = {
  'codex': '~/.codex/config.toml',
  'claude-code': '~/.claude/settings.json',
} as const satisfies Record<ProviderRuntime, string>;

export const codexDefaultConfigurationProviderKey = 'foundry_managed';

export function getCodexConfigurationManagedFieldKeys(providerKey: string) {
  const providerPath = `model_providers.${providerKey}`;
  return [
    'model',
    'model_provider',
    'forced_login_method',
    `${providerPath}.name`,
    `${providerPath}.base_url`,
    `${providerPath}.wire_api`,
    `${providerPath}.experimental_bearer_token`,
  ] as const;
}

export const runtimeConfigurationManagedFieldKeys = {
  'codex': getCodexConfigurationManagedFieldKeys(codexDefaultConfigurationProviderKey),
  'claude-code': [
    'env.ANTHROPIC_BASE_URL',
    'env.ANTHROPIC_AUTH_TOKEN',
    'env.ANTHROPIC_MODEL',
    'env.ANTHROPIC_DEFAULT_SONNET_MODEL',
    'env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_OPUS_MODEL',
    'env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_FABLE_MODEL',
    'env.ANTHROPIC_DEFAULT_FABLE_MODEL_NAME',
    'env.ANTHROPIC_DEFAULT_HAIKU_MODEL',
    'env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME',
    'env.CLAUDE_CODE_SUBAGENT_MODEL',
  ],
} as const satisfies Record<ProviderRuntime, readonly string[]>;

export type RuntimeConfigurationChangeOperation
  = typeof runtimeConfigurationChangeOperations[number];

export type RuntimeConfigurationTarget
  = | {
    kind: 'provider';
    providerId: string;
  }
  | {
    kind: 'official-default';
  };

export interface RuntimeConfigurationPreviewInput {
  runtime: ProviderRuntime;
  target: RuntimeConfigurationTarget;
}

export type RuntimeConfigurationApplyInput = RuntimeConfigurationPreviewInput;

export type RuntimeConfigurationPreviewValue
  = | {
    kind: 'absent';
  }
  | {
    kind: 'plain';
    value: string;
  }
  | {
    kind: 'secret';
    configured: boolean;
    suffix: string | null;
  };

export interface RuntimeConfigurationPreviewField {
  key: string;
  current: RuntimeConfigurationPreviewValue;
  proposed: RuntimeConfigurationPreviewValue;
  operation: RuntimeConfigurationChangeOperation;
}

export type RuntimeConfigurationPreviewTarget
  = | {
    kind: 'provider';
    providerId: string;
    name: string;
    baseUrl: string;
    hasApiKey: boolean;
    apiKeySuffix: string | null;
    connection: ProviderConnectionSummary;
  }
  | {
    kind: 'official-default';
  };

export interface RuntimeConfigurationPreview {
  runtime: ProviderRuntime;
  target: RuntimeConfigurationPreviewTarget;
  file: {
    path: typeof runtimeConfigurationPaths[ProviderRuntime];
    exists: boolean;
  };
  fields: RuntimeConfigurationPreviewField[];
}

export type RuntimeSummary
  = | {
    runtime: ProviderRuntime;
    status: 'not-managed';
    providerId: null;
    appliedAt: null;
  }
  | {
    runtime: ProviderRuntime;
    status: 'provider';
    providerId: string;
    appliedAt: number;
  }
  | {
    runtime: ProviderRuntime;
    status: 'official-default';
    providerId: null;
    appliedAt: number;
  };

export type RuntimeApiErrorCode
  = | 'invalid-input'
    | 'not-found'
    | 'conflict'
    | 'configuration-unavailable'
    | 'configuration-invalid'
    | 'storage-unavailable'
    | 'storage-corrupt'
    | 'unsupported-database-version'
    | 'internal';

export interface RuntimeApiError {
  code: RuntimeApiErrorCode;
  message: string;
}

export type RuntimeApiResult<T>
  = | { ok: true; value: T }
    | { ok: false; error: RuntimeApiError };

export interface RuntimeApi {
  listRuntimes: () => Promise<RuntimeApiResult<RuntimeSummary[]>>;
  previewRuntimeConfiguration: (
    input: RuntimeConfigurationPreviewInput,
  ) => Promise<RuntimeApiResult<RuntimeConfigurationPreview>>;
  applyRuntimeConfiguration: (
    input: RuntimeConfigurationApplyInput,
  ) => Promise<RuntimeApiResult<RuntimeSummary>>;
}
