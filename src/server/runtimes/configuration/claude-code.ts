import type {
  ClaudeCodeProviderConfiguration,
  ClaudeModelConfiguration,
  Provider,
  RuntimeConfigurationTarget,
} from '@dhzh/foundry-api-contract';

import { RuntimeOperationError } from '../error';
import type { ConfigurationPlan, ConfigurationSource } from './file';
import {
  cloneValues,
  createPreviewField,
  isRecord,
  setString,
  splitFields,
  stringifyClaude,
} from './file';

const modelPrefixes = [
  'ANTHROPIC_DEFAULT_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_FABLE_MODEL',
] as const;
const modelSuffixes = [
  '',
  '_NAME',
  '_DESCRIPTION',
  '_SUPPORTED_CAPABILITIES',
] as const;
const managedEnvironmentKeys = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  ...modelPrefixes.flatMap((prefix) =>
    modelSuffixes.map((suffix) => `${prefix}${suffix}`)),
  'CLAUDE_CODE_SUBAGENT_MODEL',
] as const;

function modelValues(
  configuration: ClaudeModelConfiguration | null,
): [string | undefined, string | undefined, string | undefined, string | undefined] {
  if (configuration === null) {
    return [undefined, undefined, undefined, undefined];
  }
  return [
    configuration.model,
    configuration.displayName ?? undefined,
    configuration.description ?? undefined,
    configuration.supportedCapabilities.length > 0
      ? configuration.supportedCapabilities.join(',')
      : undefined,
  ];
}

function createProposedEnvironment(
  configuration: ClaudeCodeProviderConfiguration | null,
): Record<string, string | undefined> {
  const proposed: Record<string, string | undefined> = Object.fromEntries(
    managedEnvironmentKeys.map((key) => [key, undefined]),
  );
  if (configuration === null) {
    return proposed;
  }

  proposed.ANTHROPIC_BASE_URL = configuration.baseUrl;
  proposed.ANTHROPIC_AUTH_TOKEN = configuration.apiKeyHeader === 'authorization'
    ? configuration.apiKey
    : undefined;
  proposed.ANTHROPIC_API_KEY = configuration.apiKeyHeader === 'x-api-key'
    ? configuration.apiKey
    : undefined;

  const models = [
    configuration.primaryModel,
    configuration.opusModel,
    configuration.sonnetModel,
    configuration.haikuModel,
    configuration.fableModel,
  ];
  for (const [index, prefix] of modelPrefixes.entries()) {
    const values = modelValues(models[index]);
    for (const [suffixIndex, suffix] of modelSuffixes.entries()) {
      proposed[`${prefix}${suffix}`] = values[suffixIndex];
    }
  }
  proposed.CLAUDE_CODE_SUBAGENT_MODEL = configuration.subagentModel ?? undefined;
  return proposed;
}

export function createClaudeCodePlan(
  source: ConfigurationSource,
  filename: string,
  target: RuntimeConfigurationTarget,
  provider: Extract<Provider, { runtime: 'claude-code' }> | null,
): ConfigurationPlan {
  const environmentValue = source.values.env;
  if (environmentValue !== undefined && !isRecord(environmentValue)) {
    throw new RuntimeOperationError(
      'RUNTIME_CONFIGURATION_INVALID',
      'Claude Code env must be an object.',
    );
  }
  const environment = environmentValue ?? {};
  const proposed = createProposedEnvironment(provider?.configuration ?? null);
  const fields = managedEnvironmentKeys.map((key) => createPreviewField(
    `env.${key}`,
    environment[key],
    proposed[key],
    key === 'ANTHROPIC_AUTH_TOKEN' || key === 'ANTHROPIC_API_KEY',
  ));
  const updated = cloneValues(source.values);
  const updatedEnvironment: Record<string, unknown> = isRecord(updated.env)
    ? updated.env
    : {};
  updated.env = updatedEnvironment;
  for (const key of managedEnvironmentKeys) {
    setString(updatedEnvironment, key, proposed[key]);
  }
  if (Object.keys(updatedEnvironment).length === 0) {
    delete updated.env;
  }
  const split = splitFields(fields);
  return {
    content: stringifyClaude(source, updated),
    preview: {
      ...split,
      file: { exists: source.exists, hash: source.hash, path: filename },
      kind: 'ready',
      providerKey: null,
      runtime: 'claude-code',
      target,
    },
    source,
  };
}
