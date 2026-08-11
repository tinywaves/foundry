import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { providerRuntimes } from '../../../../shared/provider-contract';
import type { ProviderRuntime } from '../../../../shared/provider-contract';
import type {
  RuntimeApiError,
  RuntimeApiResult,
  RuntimeConfigurationPreview,
  RuntimeConfigurationApplyInput,
  RuntimeConfigurationPreviewField,
  RuntimeConfigurationPreviewInput,
  RuntimeConfigurationPreviewValue,
  RuntimeSummary,
} from '../../../../shared/runtime-contract';
import {
  runtimeConfigurationChangeOperations,
  runtimeConfigurationManagedFieldKeys,
  runtimeConfigurationPaths,
} from '../../../../shared/runtime-contract';
import { resetProviderList } from '../providers/provider-query';

const CODEX_PROVIDER_FIELD_PREFIX = 'model_providers.';

export const runtimeQueryKeys = {
  all: ['runtimes'] as const,
  list: () => [...runtimeQueryKeys.all, 'list'] as const,
  previews: () => [...runtimeQueryKeys.all, 'preview'] as const,
  preview: (input: RuntimeConfigurationPreviewInput) => [
    ...runtimeQueryKeys.previews(),
    input.runtime,
    input.target.kind,
    ...(input.target.kind === 'provider' ? [input.target.providerId] : []),
  ] as const,
};

export class RuntimeRequestError extends Error {
  readonly apiError: RuntimeApiError | undefined;

  constructor(message: string, apiError?: RuntimeApiError) {
    super(message);
    this.name = 'RuntimeRequestError';
    this.apiError = apiError;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAppliedAt(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isConnectionSummary(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const hasValidTimestamp = value.lastTestedAt === null || isAppliedAt(value.lastTestedAt);
  if (!hasValidTimestamp) {
    return false;
  }
  switch (value.status) {
    case 'never-tested': {
      return value.lastTestedAt === null && value.lastError === null;
    }
    case 'connected': {
      return value.lastTestedAt !== null && value.lastError === null;
    }
    case 'failed': {
      return value.lastTestedAt !== null && typeof value.lastError === 'string';
    }
    default: {
      return false;
    }
  }
}

function isPreviewValue(value: unknown): value is RuntimeConfigurationPreviewValue {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.kind) {
    case 'absent': {
      return true;
    }
    case 'plain': {
      return typeof value.value === 'string';
    }
    case 'secret': {
      return typeof value.configured === 'boolean'
        && (value.suffix === null || typeof value.suffix === 'string');
    }
    default: {
      return false;
    }
  }
}

function isConsistentOperation(field: RuntimeConfigurationPreviewField): boolean {
  const isCurrentConfigured = field.current.kind === 'secret'
    ? field.current.configured
    : field.current.kind !== 'absent';
  const isProposedConfigured = field.proposed.kind === 'secret'
    ? field.proposed.configured
    : field.proposed.kind !== 'absent';
  if (!isCurrentConfigured && !isProposedConfigured) {
    return field.operation === 'no-change';
  }
  if (!isCurrentConfigured) {
    return field.operation === 'add';
  }
  if (!isProposedConfigured) {
    return field.operation === 'remove';
  }
  if (field.current.kind === 'plain' && field.proposed.kind === 'plain') {
    return field.operation === (
      field.current.value === field.proposed.value ? 'no-change' : 'update'
    );
  }
  return field.operation === 'no-change' || field.operation === 'update';
}

function isPreviewField(
  value: unknown,
  expectedKey: string,
  secretKey: string,
): value is RuntimeConfigurationPreviewField {
  if (!isRecord(value)) {
    return false;
  }
  if (
    value.key !== expectedKey
    || !isPreviewValue(value.current)
    || !isPreviewValue(value.proposed)
    || typeof value.operation !== 'string'
    || !runtimeConfigurationChangeOperations.includes(
      value.operation as typeof runtimeConfigurationChangeOperations[number],
    )
  ) {
    return false;
  }
  const isSecretField = expectedKey === secretKey;
  if (!isSecretField) {
    return value.current.kind !== 'secret'
      && value.proposed.kind !== 'secret'
      && isConsistentOperation(value as unknown as RuntimeConfigurationPreviewField);
  }
  if (value.current.kind !== 'secret' || value.proposed.kind !== 'secret') {
    return false;
  }
  const hasValidProposedSuffix = value.proposed.configured
    ? typeof value.proposed.suffix === 'string'
    && value.proposed.suffix.length > 0
    && value.proposed.suffix.length <= 4
    : value.proposed.suffix === null;
  return value.current.suffix === null
    && hasValidProposedSuffix
    && isConsistentOperation(value as unknown as RuntimeConfigurationPreviewField);
}

function getPreviewFieldKeys(
  runtime: ProviderRuntime,
  fields: unknown[],
): { fieldKeys: readonly string[]; secretKey: string } | undefined {
  if (runtime === 'claude-code') {
    const fieldKeys = runtimeConfigurationManagedFieldKeys[runtime];
    return { fieldKeys, secretKey: fieldKeys[1] };
  }

  const providerNameField = fields[3];
  if (!isRecord(providerNameField) || typeof providerNameField.key !== 'string') {
    return undefined;
  }
  const providerPrefix = providerNameField.key.endsWith('.name')
    ? providerNameField.key.slice(0, -'.name'.length)
    : '';
  if (
    !providerPrefix.startsWith(CODEX_PROVIDER_FIELD_PREFIX)
    || providerPrefix.length === CODEX_PROVIDER_FIELD_PREFIX.length
  ) {
    return undefined;
  }
  const fieldKeys = [
    'model',
    'model_provider',
    'forced_login_method',
    `${providerPrefix}.name`,
    `${providerPrefix}.base_url`,
    `${providerPrefix}.wire_api`,
    `${providerPrefix}.experimental_bearer_token`,
  ] as const;
  return { fieldKeys, secretKey: fieldKeys[6] };
}

export function isRuntimeConfigurationPreview(
  value: unknown,
  input: RuntimeConfigurationPreviewInput,
): value is RuntimeConfigurationPreview {
  const fields = isRecord(value) ? value.fields : undefined;
  if (
    !isRecord(value)
    || value.runtime !== input.runtime
    || !isRecord(value.file)
    || value.file.path !== runtimeConfigurationPaths[input.runtime]
    || typeof value.file.exists !== 'boolean'
    || !Array.isArray(fields)
    || !isRecord(value.target)
  ) {
    return false;
  }

  if (input.target.kind === 'official-default') {
    if (value.target.kind !== 'official-default') {
      return false;
    }
  } else if (
    value.target.kind !== 'provider'
    || value.target.providerId !== input.target.providerId
    || typeof value.target.name !== 'string'
    || typeof value.target.baseUrl !== 'string'
    || typeof value.target.hasApiKey !== 'boolean'
    || (value.target.hasApiKey
      ? typeof value.target.apiKeySuffix !== 'string'
      || value.target.apiKeySuffix.length === 0
      || value.target.apiKeySuffix.length > 4
      : value.target.apiKeySuffix !== null)
    || !isConnectionSummary(value.target.connection)
  ) {
    return false;
  }

  const expectedFields = getPreviewFieldKeys(input.runtime, fields);
  if (expectedFields === undefined) {
    return false;
  }
  const { fieldKeys, secretKey } = expectedFields;
  const hasValidFields = fields.length === fieldKeys.length
    && fieldKeys.every((key, index) => isPreviewField(
      fields[index],
      key,
      secretKey,
    ));
  if (!hasValidFields || input.target.kind !== 'provider') {
    return hasValidFields;
  }
  const secretField = fields.find((field) => (
    isRecord(field) && field.key === secretKey
  ));
  return isRecord(secretField)
    && isRecord(secretField.proposed)
    && secretField.proposed.kind === 'secret'
    && secretField.proposed.configured === value.target.hasApiKey
    && secretField.proposed.suffix === value.target.apiKeySuffix;
}

function isRuntimeSummary(
  value: unknown,
  expectedRuntime: ProviderRuntime,
): value is RuntimeSummary {
  if (!isRecord(value) || value.runtime !== expectedRuntime) {
    return false;
  }

  switch (value.status) {
    case 'not-managed': {
      return value.providerId === null && value.appliedAt === null;
    }
    case 'provider': {
      return typeof value.providerId === 'string'
        && value.providerId.length > 0
        && isAppliedAt(value.appliedAt);
    }
    case 'official-default': {
      return value.providerId === null && isAppliedAt(value.appliedAt);
    }
    default: {
      return false;
    }
  }
}

export function isRuntimeSummaryList(value: unknown): value is RuntimeSummary[] {
  return Array.isArray(value)
    && value.length === providerRuntimes.length
    && providerRuntimes.every((runtime, index) => (
      isRuntimeSummary(value[index], runtime)
    ));
}

export async function resolveRuntimeRequest<T>(
  request: () => Promise<RuntimeApiResult<T>>,
  fallbackMessage: string,
): Promise<T> {
  try {
    const result = await request();
    if (!result.ok) {
      throw new RuntimeRequestError(result.error.message, result.error);
    }
    return result.value;
  } catch (error) {
    if (error instanceof RuntimeRequestError) {
      throw error;
    }
    throw new RuntimeRequestError(fallbackMessage);
  }
}

export async function applyRuntimeConfiguration(
  input: RuntimeConfigurationApplyInput,
): Promise<RuntimeSummary> {
  const summary = await resolveRuntimeRequest(
    () => globalThis.api.runtimes.applyRuntimeConfiguration(input),
    'Runtime configuration could not be applied.',
  );
  if (!isRuntimeSummary(summary, input.runtime)) {
    throw new RuntimeRequestError('Runtime application response was invalid.');
  }
  const isMatchingTarget = input.target.kind === 'provider'
    ? summary.status === 'provider' && summary.providerId === input.target.providerId
    : summary.status === 'official-default';
  if (!isMatchingTarget) {
    throw new RuntimeRequestError('Runtime application response did not match the target.');
  }
  return summary;
}

export function getRuntimeListQueryOptions() {
  return queryOptions({
    queryKey: runtimeQueryKeys.list(),
    queryFn: async (): Promise<RuntimeSummary[]> => {
      const runtimes = await resolveRuntimeRequest(
        () => globalThis.api.runtimes.listRuntimes(),
        'Runtime data could not be loaded.',
      );
      if (!isRuntimeSummaryList(runtimes)) {
        throw new RuntimeRequestError('Runtime data was invalid.');
      }
      return runtimes;
    },
    gcTime: Infinity,
    refetchOnMount: false,
    retryOnMount: false,
    staleTime: Infinity,
  });
}

export function getRuntimePreviewQueryOptions(input: RuntimeConfigurationPreviewInput) {
  return queryOptions({
    queryKey: runtimeQueryKeys.preview(input),
    queryFn: async (): Promise<RuntimeConfigurationPreview> => {
      const preview = await resolveRuntimeRequest(
        () => globalThis.api.runtimes.previewRuntimeConfiguration(input),
        'Runtime configuration could not be previewed.',
      );
      if (!isRuntimeConfigurationPreview(preview, input)) {
        throw new RuntimeRequestError('Runtime configuration preview was invalid.');
      }
      return preview;
    },
    gcTime: 0,
    retry: false,
    staleTime: 0,
  });
}

export function resetRuntimeList(queryClient: QueryClient): Promise<void> {
  return queryClient.resetQueries({
    exact: true,
    queryKey: runtimeQueryKeys.list(),
  });
}

export async function resetRuntimeProviderState(
  queryClient: QueryClient,
  runtime: ProviderRuntime,
): Promise<void> {
  await Promise.all([
    resetRuntimeList(queryClient),
    resetProviderList(queryClient, runtime),
  ]);
}
