import type {
  Provider,
  ProviderRuntime,
  RuntimeConfigurationPreview,
  RuntimeConfigurationTarget,
} from '@dhzh/foundry-api-contract';

import { RuntimeOperationError } from '../error';
import { createClaudeCodePlan } from './claude-code';
import { createCodexPlan } from './codex';
import type {
  ConfigurationPlan,
  RuntimeConfigurationChange,
} from './file';
import { applyConfigurationPlan, readConfiguration } from './file';

function requireProvider(
  runtime: ProviderRuntime,
  target: RuntimeConfigurationTarget,
  provider: Provider | null,
): Provider | null {
  if (target.kind === 'official-default') {
    return null;
  }
  if (
    provider?.id !== target.providerId
    || provider.runtime !== runtime
  ) {
    throw new RuntimeOperationError(
      'PROVIDER_NOT_FOUND',
      'The selected Provider is unavailable.',
    );
  }
  return provider;
}

async function createPlan(
  runtime: ProviderRuntime,
  filename: string,
  target: RuntimeConfigurationTarget,
  provider: Provider | null,
  providerKey: string | undefined,
): Promise<ConfigurationPlan | RuntimeConfigurationPreview> {
  const source = await readConfiguration(runtime, filename);
  const resolvedProvider = requireProvider(runtime, target, provider);
  return runtime === 'codex'
    ? createCodexPlan(
        source,
        filename,
        target,
        resolvedProvider as Extract<Provider, { runtime: 'codex' }> | null,
        providerKey,
      )
    : createClaudeCodePlan(
        source,
        filename,
        target,
        resolvedProvider as Extract<Provider, { runtime: 'claude-code' }> | null,
      );
}

function isPlan(
  value: ConfigurationPlan | RuntimeConfigurationPreview,
): value is ConfigurationPlan {
  return 'preview' in value;
}

export class RuntimeConfigurationManager {
  async preview(
    runtime: ProviderRuntime,
    filename: string,
    target: RuntimeConfigurationTarget,
    provider: Provider | null,
    providerKey?: string,
  ): Promise<RuntimeConfigurationPreview> {
    const result = await createPlan(runtime, filename, target, provider, providerKey);
    return isPlan(result) ? result.preview : result;
  }

  async apply(
    runtime: ProviderRuntime,
    filename: string,
    target: RuntimeConfigurationTarget,
    provider: Provider | null,
    expectedFileHash: string,
    providerKey?: string,
  ): Promise<RuntimeConfigurationChange> {
    const result = await createPlan(runtime, filename, target, provider, providerKey);
    if (!isPlan(result)) {
      throw new RuntimeOperationError(
        'RUNTIME_CONFIGURATION_INVALID',
        'Select a Codex Provider key before applying changes.',
      );
    }
    return applyConfigurationPlan(runtime, filename, result, expectedFileHash);
  }
}
