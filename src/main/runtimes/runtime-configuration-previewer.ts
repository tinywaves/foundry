import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseToml } from '@decimalturn/toml-patch';
import type {
  ProviderDetail,
  ProviderRuntime,
} from '../../shared/provider-contract';
import { providerRuntimes } from '../../shared/provider-contract';
import type {
  RuntimeConfigurationChangeOperation,
  RuntimeConfigurationPreview,
  RuntimeConfigurationPreviewField,
  RuntimeConfigurationPreviewInput,
  RuntimeConfigurationPreviewTarget,
  RuntimeConfigurationPreviewValue,
  RuntimeConfigurationTarget,
} from '../../shared/runtime-contract';
import {
  codexDefaultConfigurationProviderKey,
  getCodexConfigurationManagedFieldKeys,
  runtimeConfigurationManagedFieldKeys,
  runtimeConfigurationPaths,
} from '../../shared/runtime-contract';
import { ProviderOperationError } from '../providers/provider-error';
import type { ProviderRepository } from '../providers/provider-repository';
import { RuntimeOperationError } from './runtime-error';

const PROVIDER_ID_PATTERN
  = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReadTextFile = (filename: string) => Promise<string>;

interface ConfigurationSource {
  exists: boolean;
  content: string | null;
  values: Record<string, unknown>;
}

export interface RuntimeConfigurationPlanField {
  key: string;
  isSecret: boolean;
  currentValue: string | undefined;
  proposedValue: string | undefined;
  proposedSecretSuffix: string | null;
}

export interface RuntimeConfigurationPlan {
  runtime: ProviderRuntime;
  configurationProviderKey: string | null;
  target: RuntimeConfigurationPreviewTarget;
  file: {
    absolutePath: string;
    path: typeof runtimeConfigurationPaths[ProviderRuntime];
    exists: boolean;
  };
  source: {
    content: string | null;
    values: Record<string, unknown>;
  };
  fields: RuntimeConfigurationPlanField[];
}

interface ProviderReader {
  getProviderForEdit: ProviderRepository['getProviderForEdit'];
}

interface CodexConfigurationProvider {
  key: string;
  values: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseProviderId(value: unknown): string {
  if (typeof value !== 'string' || !PROVIDER_ID_PATTERN.test(value)) {
    throw new RuntimeOperationError('invalid-input', 'Provide a valid Provider ID.');
  }
  return value;
}

function parseRuntime(value: unknown): ProviderRuntime {
  if (typeof value !== 'string' || !providerRuntimes.includes(value as ProviderRuntime)) {
    throw new RuntimeOperationError('invalid-input', 'Select a supported Runtime.');
  }
  return value as ProviderRuntime;
}

function parseTarget(value: unknown): RuntimeConfigurationTarget {
  if (!isRecord(value)) {
    throw new RuntimeOperationError('invalid-input', 'Select a Runtime target.');
  }
  if (value.kind === 'official-default') {
    return { kind: 'official-default' };
  }
  if (value.kind === 'provider') {
    return { kind: 'provider', providerId: parseProviderId(value.providerId) };
  }
  throw new RuntimeOperationError('invalid-input', 'Select a Runtime target.');
}

export function parseRuntimeConfigurationInput(
  value: unknown,
): RuntimeConfigurationPreviewInput {
  if (!isRecord(value)) {
    throw new RuntimeOperationError('invalid-input', 'Runtime preview input is invalid.');
  }
  return {
    runtime: parseRuntime(value.runtime),
    target: parseTarget(value.target),
  };
}

function getFileErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  return typeof error.code === 'string' ? error.code : undefined;
}

function requireConfigurationRecord(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RuntimeOperationError('configuration-invalid', message);
  }
  return value;
}

function getOptionalRecord(
  parent: Record<string, unknown>,
  key: string,
  message: string,
): Record<string, unknown> {
  const value = parent[key];
  if (value === undefined) {
    return {};
  }
  return requireConfigurationRecord(value, message);
}

function getManagedString(
  parent: Record<string, unknown>,
  key: string,
  message: string,
): string | undefined {
  const value = parent[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new RuntimeOperationError('configuration-invalid', message);
  }
  return value;
}

function createField(
  key: string,
  currentValue: string | undefined,
  proposedValue: string | undefined,
  options: { isSecret?: boolean; proposedSecretSuffix?: string | null } = {},
): RuntimeConfigurationPlanField {
  return {
    key,
    currentValue,
    proposedValue,
    isSecret: options.isSecret ?? false,
    proposedSecretSuffix: options.proposedSecretSuffix ?? null,
  };
}

function resolveCodexConfigurationProvider(
  values: Record<string, unknown>,
): CodexConfigurationProvider {
  const modelProviders = getOptionalRecord(
    values,
    'model_providers',
    'Codex model_providers must be a table.',
  );
  const currentKey = getManagedString(
    values,
    'model_provider',
    'Codex model_provider must be a string.',
  );
  if (
    currentKey !== undefined
    && Object.hasOwn(modelProviders, currentKey)
  ) {
    return {
      key: currentKey,
      values: requireConfigurationRecord(
        modelProviders[currentKey],
        `Codex model_providers.${currentKey} must be a table.`,
      ),
    };
  }

  const providerKeys = Object.keys(modelProviders);
  for (const key of providerKeys) {
    requireConfigurationRecord(
      modelProviders[key],
      `Codex model_providers.${key} must be a table.`,
    );
  }
  if (providerKeys.length === 1) {
    const [key] = providerKeys;
    return {
      key,
      values: modelProviders[key] as Record<string, unknown>,
    };
  }
  if (providerKeys.length > 1) {
    throw new RuntimeOperationError(
      'configuration-invalid',
      'Codex model_provider must select one of the existing Provider tables.',
    );
  }

  return {
    key: codexDefaultConfigurationProviderKey,
    values: getOptionalRecord(
      modelProviders,
      codexDefaultConfigurationProviderKey,
      'Codex model_providers.foundry_managed must be a table.',
    ),
  };
}

function createCodexSelectionFields(
  values: Record<string, unknown>,
  selection: { model: string; providerKey: string } | undefined,
): RuntimeConfigurationPlanField[] {
  return [
    createField(
      'model',
      getManagedString(values, 'model', 'Codex model must be a string.'),
      selection?.model,
    ),
    createField(
      'model_provider',
      getManagedString(
        values,
        'model_provider',
        'Codex model_provider must be a string.',
      ),
      selection?.providerKey,
    ),
    createField(
      'forced_login_method',
      getManagedString(
        values,
        'forced_login_method',
        'Codex forced_login_method must be a string.',
      ),
      selection === undefined ? undefined : 'api',
    ),
  ];
}

function createCodexProviderFields(
  values: Record<string, unknown>,
  provider: Extract<ProviderDetail, { runtime: 'codex' }>,
  configurationProvider: CodexConfigurationProvider,
): RuntimeConfigurationPlanField[] {
  const fieldKeys = getCodexConfigurationManagedFieldKeys(configurationProvider.key);
  return [
    ...createCodexSelectionFields(values, {
      model: provider.modelConfig.defaultModel,
      providerKey: configurationProvider.key,
    }),
    createField(
      fieldKeys[3],
      getManagedString(
        configurationProvider.values,
        'name',
        'Codex configuration Provider name must be a string.',
      ),
      provider.name,
    ),
    createField(
      fieldKeys[4],
      getManagedString(
        configurationProvider.values,
        'base_url',
        'Codex configuration Provider base_url must be a string.',
      ),
      provider.baseUrl,
    ),
    createField(
      fieldKeys[5],
      getManagedString(
        configurationProvider.values,
        'wire_api',
        'Codex configuration Provider wire_api must be a string.',
      ),
      'responses',
    ),
    createField(
      fieldKeys[6],
      getManagedString(
        configurationProvider.values,
        'experimental_bearer_token',
        'Codex configuration Provider bearer token must be a string.',
      ),
      provider.apiKey ?? undefined,
      {
        isSecret: true,
        proposedSecretSuffix: provider.apiKeySuffix,
      },
    ),
  ];
}

function createClaudeCodeFields(
  values: Record<string, unknown>,
  provider: Extract<ProviderDetail, { runtime: 'claude-code' }> | undefined,
): RuntimeConfigurationPlanField[] {
  const environment = getOptionalRecord(
    values,
    'env',
    'Claude Code env must be an object.',
  );
  const proposed = provider === undefined
    ? undefined
    : {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey ?? undefined,
        apiKeySuffix: provider.apiKeySuffix,
        fallback: provider.modelConfig.defaultFallbackModel,
        sonnet: provider.modelConfig.sonnet,
        opus: provider.modelConfig.opus,
        fable: provider.modelConfig.fable,
        haiku: provider.modelConfig.haiku,
        subagent: provider.modelConfig.subagent.requestModel,
      };
  const plainField = (
    fieldKey: string,
    environmentKey: string,
    proposedValue: string | undefined,
  ) => createField(
    fieldKey,
    getManagedString(
      environment,
      environmentKey,
      `Claude Code ${environmentKey} must be a string.`,
    ),
    proposedValue,
  );

  return [
    plainField(
      runtimeConfigurationManagedFieldKeys['claude-code'][0],
      'ANTHROPIC_BASE_URL',
      proposed?.baseUrl,
    ),
    createField(
      runtimeConfigurationManagedFieldKeys['claude-code'][1],
      getManagedString(
        environment,
        'ANTHROPIC_AUTH_TOKEN',
        'Claude Code ANTHROPIC_AUTH_TOKEN must be a string.',
      ),
      proposed?.apiKey,
      {
        isSecret: true,
        proposedSecretSuffix: proposed?.apiKeySuffix,
      },
    ),
    plainField(
      runtimeConfigurationManagedFieldKeys['claude-code'][2],
      'ANTHROPIC_MODEL',
      proposed?.fallback,
    ),
    plainField(
      runtimeConfigurationManagedFieldKeys['claude-code'][3],
      'ANTHROPIC_DEFAULT_SONNET_MODEL',
      proposed?.sonnet.requestModel,
    ),
    plainField(
      runtimeConfigurationManagedFieldKeys['claude-code'][4],
      'ANTHROPIC_DEFAULT_SONNET_MODEL_NAME',
      proposed?.sonnet.displayName,
    ),
    plainField(
      runtimeConfigurationManagedFieldKeys['claude-code'][5],
      'ANTHROPIC_DEFAULT_OPUS_MODEL',
      proposed?.opus.requestModel,
    ),
    plainField(
      runtimeConfigurationManagedFieldKeys['claude-code'][6],
      'ANTHROPIC_DEFAULT_OPUS_MODEL_NAME',
      proposed?.opus.displayName,
    ),
    plainField(
      runtimeConfigurationManagedFieldKeys['claude-code'][7],
      'ANTHROPIC_DEFAULT_FABLE_MODEL',
      proposed?.fable.requestModel,
    ),
    plainField(
      runtimeConfigurationManagedFieldKeys['claude-code'][8],
      'ANTHROPIC_DEFAULT_FABLE_MODEL_NAME',
      proposed?.fable.displayName,
    ),
    plainField(
      runtimeConfigurationManagedFieldKeys['claude-code'][9],
      'ANTHROPIC_DEFAULT_HAIKU_MODEL',
      proposed?.haiku.requestModel,
    ),
    plainField(
      runtimeConfigurationManagedFieldKeys['claude-code'][10],
      'ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME',
      proposed?.haiku.displayName,
    ),
    plainField(
      runtimeConfigurationManagedFieldKeys['claude-code'][11],
      'CLAUDE_CODE_SUBAGENT_MODEL',
      proposed?.subagent,
    ),
  ];
}

function getOperation(field: RuntimeConfigurationPlanField): RuntimeConfigurationChangeOperation {
  if (field.currentValue === undefined && field.proposedValue === undefined) {
    return 'no-change';
  }
  if (field.currentValue === undefined) {
    return 'add';
  }
  if (field.proposedValue === undefined) {
    return 'remove';
  }
  return field.currentValue === field.proposedValue ? 'no-change' : 'update';
}

function projectValue(
  value: string | undefined,
  isSecret: boolean,
  suffix: string | null,
): RuntimeConfigurationPreviewValue {
  if (isSecret) {
    return {
      kind: 'secret',
      configured: value !== undefined,
      suffix: value === undefined ? null : suffix,
    };
  }
  return value === undefined ? { kind: 'absent' } : { kind: 'plain', value };
}

function projectField(field: RuntimeConfigurationPlanField): RuntimeConfigurationPreviewField {
  return {
    key: field.key,
    current: projectValue(field.currentValue, field.isSecret, null),
    proposed: projectValue(
      field.proposedValue,
      field.isSecret,
      field.proposedSecretSuffix,
    ),
    operation: getOperation(field),
  };
}

function mapProviderError(error: ProviderOperationError): RuntimeOperationError {
  switch (error.code) {
    case 'not-found': {
      return new RuntimeOperationError('not-found', 'Provider was not found.');
    }
    case 'storage-unavailable':
    case 'storage-corrupt':
    case 'unsupported-database-version': {
      return new RuntimeOperationError(error.code, error.message);
    }
    default: {
      return new RuntimeOperationError('internal', 'Provider data could not be read.');
    }
  }
}

export class RuntimeConfigurationPreviewer {
  private readonly readTextFile: ReadTextFile;

  constructor(
    private readonly userHomeDirectory: string,
    private readonly providerReader: ProviderReader,
    readTextFile: ReadTextFile = async (filename) => readFile(filename, 'utf8'),
  ) {
    this.readTextFile = readTextFile;
  }

  private getProvider(
    runtime: ProviderRuntime,
    target: RuntimeConfigurationTarget,
  ): ProviderDetail | undefined {
    if (target.kind === 'official-default') {
      return undefined;
    }
    let provider: ProviderDetail;
    try {
      provider = this.providerReader.getProviderForEdit(target.providerId);
    } catch (error) {
      if (error instanceof ProviderOperationError) {
        throw mapProviderError(error);
      }
      throw error;
    }
    if (provider.source !== 'user-custom' || provider.runtime !== runtime) {
      throw new RuntimeOperationError(
        'invalid-input',
        'Provider does not belong to the selected Runtime.',
      );
    }
    return provider;
  }

  private async readConfiguration(
    absolutePath: string,
    runtime: ProviderRuntime,
  ): Promise<ConfigurationSource> {
    let content: string;
    try {
      content = await this.readTextFile(absolutePath);
    } catch (error) {
      if (getFileErrorCode(error) === 'ENOENT') {
        return { exists: false, content: null, values: {} };
      }
      throw new RuntimeOperationError(
        'configuration-unavailable',
        `${runtime === 'codex' ? 'Codex' : 'Claude Code'} configuration could not be read.`,
      );
    }

    try {
      const parsed: unknown = runtime === 'codex' ? parseToml(content) : JSON.parse(content);
      return {
        exists: true,
        content,
        values: requireConfigurationRecord(
          parsed,
          `${runtime === 'codex' ? 'Codex' : 'Claude Code'} configuration is invalid.`,
        ),
      };
    } catch (error) {
      if (error instanceof RuntimeOperationError) {
        throw error;
      }
      throw new RuntimeOperationError(
        'configuration-invalid',
        `${runtime === 'codex' ? 'Codex' : 'Claude Code'} configuration is invalid.`,
      );
    }
  }

  async createPlan(inputValue: unknown): Promise<RuntimeConfigurationPlan> {
    const input = parseRuntimeConfigurationInput(inputValue);
    const provider = this.getProvider(input.runtime, input.target);
    const isCodex = input.runtime === 'codex';
    const logicalPath = runtimeConfigurationPaths[input.runtime];
    const absolutePath = path.join(
      this.userHomeDirectory,
      ...(isCodex ? ['.codex', 'config.toml'] : ['.claude', 'settings.json']),
    );
    const source = await this.readConfiguration(absolutePath, input.runtime);
    const target: RuntimeConfigurationPreviewTarget = provider === undefined
      ? { kind: 'official-default' }
      : {
          kind: 'provider',
          providerId: provider.id,
          name: provider.name,
          baseUrl: provider.baseUrl,
          hasApiKey: provider.hasApiKey,
          apiKeySuffix: provider.apiKeySuffix,
          connection: provider.connection,
        };
    let configurationProviderKey: string | null = null;
    let fields: RuntimeConfigurationPlanField[];
    if (input.runtime === 'codex') {
      if (provider !== undefined && provider.runtime !== 'codex') {
        throw new RuntimeOperationError('invalid-input', 'Provider Runtime is invalid.');
      }
      if (provider === undefined) {
        fields = createCodexSelectionFields(source.values, undefined);
      } else {
        const configurationProvider = resolveCodexConfigurationProvider(source.values);
        configurationProviderKey = configurationProvider.key;
        fields = createCodexProviderFields(source.values, provider, configurationProvider);
      }
    } else {
      if (provider !== undefined && provider.runtime !== 'claude-code') {
        throw new RuntimeOperationError('invalid-input', 'Provider Runtime is invalid.');
      }
      fields = createClaudeCodeFields(source.values, provider);
    }

    return {
      runtime: input.runtime,
      configurationProviderKey,
      target,
      file: {
        absolutePath,
        path: logicalPath,
        exists: source.exists,
      },
      source: {
        content: source.content,
        values: source.values,
      },
      fields,
    };
  }

  async preview(inputValue: unknown): Promise<RuntimeConfigurationPreview> {
    const plan = await this.createPlan(inputValue);
    return {
      runtime: plan.runtime,
      target: plan.target,
      file: {
        path: plan.file.path,
        exists: plan.file.exists,
      },
      fields: plan.fields.map((field) => projectField(field)),
    };
  }
}
