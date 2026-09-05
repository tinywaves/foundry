import type {
  Provider,
  RuntimeConfigurationPreview,
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
  stringifyCodex,
} from './file';

const topLevelFields = ['model', 'review_model', 'model_provider'] as const;
const providerFields = [
  'name',
  'base_url',
  'wire_api',
  'experimental_bearer_token',
] as const;

function getModelProviders(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const modelProviders = values.model_providers;
  if (modelProviders === undefined) {
    return {};
  }
  if (!isRecord(modelProviders)) {
    throw new RuntimeOperationError(
      'RUNTIME_CONFIGURATION_INVALID',
      'Codex model_providers must be a table.',
    );
  }
  return modelProviders;
}

function getProviderKeys(values: Record<string, unknown>): string[] {
  return Object.entries(getModelProviders(values))
    .filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]))
    .map(([key]) => key);
}

function resolveProviderKey(
  values: Record<string, unknown>,
  requestedKey: string | undefined,
): { key: string | null; keys: string[] } {
  const keys = getProviderKeys(values);
  if (keys.length === 0) {
    if (requestedKey !== undefined && requestedKey !== 'foundry') {
      throw new RuntimeOperationError(
        'RUNTIME_CONFIGURATION_INVALID',
        'The selected Codex Provider key is unavailable.',
      );
    }
    return { key: 'foundry', keys };
  }
  if (keys.length === 1) {
    if (requestedKey !== undefined && requestedKey !== keys[0]) {
      throw new RuntimeOperationError(
        'RUNTIME_CONFIGURATION_INVALID',
        'The selected Codex Provider key is unavailable.',
      );
    }
    return { key: keys[0], keys };
  }
  if (requestedKey === undefined) {
    return { key: null, keys };
  }
  if (!keys.includes(requestedKey)) {
    throw new RuntimeOperationError(
      'RUNTIME_CONFIGURATION_INVALID',
      'The selected Codex Provider key is unavailable.',
    );
  }
  return { key: requestedKey, keys };
}

function getProviderTable(
  values: Record<string, unknown>,
  providerKey: string,
): Record<string, unknown> {
  const value = getModelProviders(values)[providerKey];
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw new RuntimeOperationError(
      'RUNTIME_CONFIGURATION_INVALID',
      `Codex model_providers.${providerKey} must be a table.`,
    );
  }
  return value;
}

export function createCodexPlan(
  source: ConfigurationSource,
  filename: string,
  target: RuntimeConfigurationTarget,
  provider: Extract<Provider, { runtime: 'codex' }> | null,
  requestedProviderKey: string | undefined,
): ConfigurationPlan | Extract<RuntimeConfigurationPreview, { kind: 'provider-key-selection' }> {
  if (target.kind === 'official-default') {
    const fields = topLevelFields.map((key) =>
      createPreviewField(key, source.values[key], undefined));
    const updated = cloneValues(source.values);
    for (const key of topLevelFields) {
      delete updated[key];
    }
    const split = splitFields(fields);
    return {
      content: stringifyCodex(source, updated),
      preview: {
        ...split,
        file: { exists: source.exists, hash: source.hash, path: filename },
        kind: 'ready',
        providerKey: null,
        runtime: 'codex',
        target,
      },
      source,
    };
  }

  if (provider === null) {
    throw new RuntimeOperationError('PROVIDER_NOT_FOUND', 'The selected Provider is unavailable.');
  }
  const resolution = resolveProviderKey(source.values, requestedProviderKey);
  if (resolution.key === null) {
    return {
      file: { exists: source.exists, hash: source.hash, path: filename },
      kind: 'provider-key-selection',
      providerKeys: resolution.keys,
      runtime: 'codex',
      target,
    };
  }

  const providerKey = resolution.key;
  const providerTable = getProviderTable(source.values, providerKey);
  const proposedTopLevel = {
    model: provider.configuration.primaryModel,
    model_provider: providerKey,
    review_model: provider.configuration.reviewModel ?? undefined,
  };
  const proposedProvider = {
    base_url: provider.configuration.baseUrl,
    experimental_bearer_token: provider.configuration.apiKey ?? undefined,
    name: provider.name,
    wire_api: 'responses',
  };
  const fields = [
    ...topLevelFields.map((key) =>
      createPreviewField(key, source.values[key], proposedTopLevel[key])),
    ...providerFields.map((key) => createPreviewField(
      `[model_providers.${providerKey}].${key}`,
      providerTable[key],
      proposedProvider[key],
      key === 'experimental_bearer_token',
    )),
  ];
  const updated = cloneValues(source.values);
  for (const key of topLevelFields) {
    setString(updated, key, proposedTopLevel[key]);
  }
  const modelProviders: Record<string, unknown> = isRecord(updated.model_providers)
    ? updated.model_providers
    : {};
  updated.model_providers = modelProviders;
  const updatedProvider: Record<string, unknown> = isRecord(modelProviders[providerKey])
    ? modelProviders[providerKey]
    : {};
  modelProviders[providerKey] = updatedProvider;
  for (const key of providerFields) {
    setString(updatedProvider, key, proposedProvider[key]);
  }
  const split = splitFields(fields);
  return {
    content: stringifyCodex(source, updated),
    preview: {
      ...split,
      file: { exists: source.exists, hash: source.hash, path: filename },
      kind: 'ready',
      providerKey,
      runtime: 'codex',
      target,
    },
    source,
  };
}
