import assert from 'node:assert/strict';
import { test } from 'vitest';
import type {
  ProviderRuntime,
  ProviderSummary,
} from '../../../../shared/provider-contract';
import type { RuntimeSummary } from '../../../../shared/runtime-contract';
import {
  getEffectiveRuntimeTarget,
  getPersistedRuntimeTarget,
  getRuntimeConfigurationTarget,
  getRuntimeTargetOptions,
  hasRuntimeTargetChange,
  OFFICIAL_DEFAULT_TARGET,
  withoutRuntimeDraftTarget,
  withRuntimeDraftTarget,
} from './runtime-target';

function createProvider(id: string, runtime: ProviderRuntime): ProviderSummary {
  return {
    id,
    runtime,
    source: 'user-custom',
    name: `Provider ${id}`,
    baseUrl: `https://${id}.example.com`,
    remark: null,
    officialWebsite: null,
    hasApiKey: true,
    apiKeySuffix: '1234',
    hasCustomAvatar: false,
    isInUse: false,
    connection: {
      status: 'never-tested',
      lastTestedAt: null,
      lastError: null,
    },
    createdAt: 1,
    updatedAt: 1,
  };
}

const unmanaged: RuntimeSummary = {
  runtime: 'codex',
  status: 'not-managed',
  providerId: null,
  appliedAt: null,
};
const providerManaged: RuntimeSummary = {
  runtime: 'codex',
  status: 'provider',
  providerId: 'provider-1',
  appliedAt: 1,
};
const officialDefault: RuntimeSummary = {
  runtime: 'codex',
  status: 'official-default',
  providerId: null,
  appliedAt: 1,
};

test('derives target values from all persisted Runtime states', () => {
  assert.equal(getPersistedRuntimeTarget(unmanaged), undefined);
  assert.equal(getPersistedRuntimeTarget(providerManaged), 'provider-1');
  assert.equal(getPersistedRuntimeTarget(officialDefault), OFFICIAL_DEFAULT_TARGET);
});

test('keeps page-local draft targets as independent Runtime overrides', () => {
  const firstDraft = withRuntimeDraftTarget({}, 'codex', OFFICIAL_DEFAULT_TARGET);
  const secondDraft = withRuntimeDraftTarget(firstDraft, 'claude-code', 'claude-provider');

  assert.equal(getEffectiveRuntimeTarget(providerManaged, firstDraft), OFFICIAL_DEFAULT_TARGET);
  assert.equal(getEffectiveRuntimeTarget(providerManaged, {}), 'provider-1');
  assert.deepEqual(secondDraft, {
    'codex': OFFICIAL_DEFAULT_TARGET,
    'claude-code': 'claude-provider',
  });
  assert.deepEqual(withoutRuntimeDraftTarget(secondDraft, 'codex'), {
    'claude-code': 'claude-provider',
  });
});

test('maps draft values to preview targets and detects persisted changes', () => {
  assert.deepEqual(
    getRuntimeConfigurationTarget(OFFICIAL_DEFAULT_TARGET),
    { kind: 'official-default' },
  );
  assert.deepEqual(
    getRuntimeConfigurationTarget('provider-2'),
    { kind: 'provider', providerId: 'provider-2' },
  );
  assert.equal(hasRuntimeTargetChange(unmanaged, undefined), false);
  assert.equal(hasRuntimeTargetChange(unmanaged, OFFICIAL_DEFAULT_TARGET), true);
  assert.equal(hasRuntimeTargetChange(providerManaged, 'provider-1'), false);
  assert.equal(hasRuntimeTargetChange(providerManaged, OFFICIAL_DEFAULT_TARGET), true);
  assert.equal(hasRuntimeTargetChange(officialDefault, OFFICIAL_DEFAULT_TARGET), false);
});

test('puts Official Default first and filters Providers to the selected Runtime', () => {
  const codex = createProvider('codex-provider', 'codex');
  const claude = createProvider('claude-provider', 'claude-code');
  const builtIn = {
    ...createProvider('built-in', 'codex'),
    source: 'foundry-built-in' as const,
  };

  assert.deepEqual(
    getRuntimeTargetOptions('codex', [claude, builtIn, codex]),
    [
      { value: OFFICIAL_DEFAULT_TARGET, label: 'Official Default' },
      { value: codex.id, label: codex.name },
    ],
  );
  assert.deepEqual(
    getRuntimeTargetOptions('claude-code', []),
    [{ value: OFFICIAL_DEFAULT_TARGET, label: 'Official Default' }],
  );
});
