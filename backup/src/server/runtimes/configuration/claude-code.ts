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

const roleModelPrefixes = [
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
const roleModelEnvironmentKeys = roleModelPrefixes.flatMap((prefix) =>
  modelSuffixes.map((suffix) => `${prefix}${suffix}`));
const subagentEnvironmentKeys = [
  'CLAUDE_CODE_SUBAGENT_MODEL',
  'CLAUDE_CODE_SUBAGENT_MODEL_FORCE',
] as const;
const otherEnvironmentKeys = [
  'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS',
  'ENABLE_TOOL_SEARCH',
  'CLAUDE_CODE_EFFORT_LEVEL',
  'DISABLE_AUTOUPDATER',
] as const;
const attributionKeys = ['commit', 'pr', 'sessionUrl'] as const;
const managedEnvironmentKeys = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  ...roleModelEnvironmentKeys,
  ...subagentEnvironmentKeys,
  ...otherEnvironmentKeys,
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
  proposed.ANTHROPIC_MODEL = configuration.defaultModel;

  const models = [
    configuration.opusModel,
    configuration.sonnetModel,
    configuration.haikuModel,
    configuration.fableModel,
  ];
  for (const [index, prefix] of roleModelPrefixes.entries()) {
    const values = modelValues(models[index]);
    for (const [suffixIndex, suffix] of modelSuffixes.entries()) {
      proposed[`${prefix}${suffix}`] = values[suffixIndex];
    }
  }
  proposed.CLAUDE_CODE_SUBAGENT_MODEL = configuration.subagentModel ?? undefined;
  proposed.CLAUDE_CODE_SUBAGENT_MODEL_FORCE = configuration.subagentModelForce
    ? '1'
    : undefined;
  proposed.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = configuration.teammatesMode
    ? '1'
    : undefined;
  proposed.ENABLE_TOOL_SEARCH = configuration.enableToolSearch ? 'true' : undefined;
  proposed.CLAUDE_CODE_EFFORT_LEVEL = configuration.maxEffortThinking
    ? 'max'
    : undefined;
  proposed.DISABLE_AUTOUPDATER = configuration.disableAutoUpdater ? '1' : undefined;
  return proposed;
}

function createProposedAttribution(
  configuration: ClaudeCodeProviderConfiguration | null,
): Record<(typeof attributionKeys)[number], string | boolean | undefined> {
  const shouldHideAiAttribution = configuration?.hideAiAttribution === true;
  return {
    commit: shouldHideAiAttribution ? '' : undefined,
    pr: shouldHideAiAttribution ? '' : undefined,
    sessionUrl: shouldHideAiAttribution ? false : undefined,
  };
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
  const attributionValue = source.values.attribution;
  if (attributionValue !== undefined && !isRecord(attributionValue)) {
    throw new RuntimeOperationError(
      'RUNTIME_CONFIGURATION_INVALID',
      'Claude Code attribution must be an object.',
    );
  }
  const attribution = attributionValue ?? {};
  const proposedAttribution = createProposedAttribution(provider?.configuration ?? null);
  const fields = [
    ...managedEnvironmentKeys.map((key) => createPreviewField(
      `env.${key}`,
      environment[key],
      proposed[key],
      key === 'ANTHROPIC_AUTH_TOKEN' || key === 'ANTHROPIC_API_KEY',
    )),
    ...attributionKeys.map((key) => createPreviewField(
      `attribution.${key}`,
      attribution[key],
      proposedAttribution[key],
    )),
  ];
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
  const updatedAttribution: Record<string, unknown> = isRecord(updated.attribution)
    ? updated.attribution
    : {};
  updated.attribution = updatedAttribution;
  for (const key of attributionKeys) {
    const value = proposedAttribution[key];
    if (value === undefined) {
      delete updatedAttribution[key];
    } else {
      updatedAttribution[key] = value;
    }
  }
  if (Object.keys(updatedAttribution).length === 0) {
    delete updated.attribution;
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
