import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ProviderDetail } from '../../shared/provider-contract';
import type { RuntimeApiErrorCode } from '../../shared/runtime-contract';
import { RuntimeOperationError } from './runtime-error';
import { RuntimeConfigurationPreviewer } from './runtime-configuration-previewer';

const codexProviderId = '00000000-0000-4000-8000-000000000001';
const claudeProviderId = '00000000-0000-4000-8000-000000000002';

function createCodexProvider(): Extract<ProviderDetail, { runtime: 'codex' }> {
  return {
    source: 'user-custom',
    name: 'Codex Proxy',
    baseUrl: 'https://codex.example.com',
    remark: null,
    officialWebsite: null,
    hasApiKey: true,
    apiKeySuffix: '7890',
    hasCustomAvatar: false,
    isInUse: false,
    connection: {
      status: 'connected',
      lastTestedAt: 10,
      lastError: null,
    },
    createdAt: 1,
    updatedAt: 1,
    id: codexProviderId,
    runtime: 'codex',
    apiKey: 'codex-plaintext-secret-7890',
    modelConfig: { version: 1, defaultModel: 'codex-model' },
  };
}

function createClaudeProvider(): Extract<ProviderDetail, { runtime: 'claude-code' }> {
  const common = {
    source: 'user-custom' as const,
    name: 'Claude Proxy',
    baseUrl: 'https://claude-code.example.com',
    remark: null,
    officialWebsite: null,
    hasApiKey: false,
    apiKeySuffix: null,
    hasCustomAvatar: false,
    isInUse: false,
    connection: {
      status: 'connected' as const,
      lastTestedAt: 10,
      lastError: null,
    },
    createdAt: 1,
    updatedAt: 1,
  };
  return {
    ...common,
    id: claudeProviderId,
    runtime: 'claude-code',
    apiKey: null,
    modelConfig: {
      version: 1,
      sonnet: { displayName: 'Sonnet Display', requestModel: 'sonnet-model' },
      opus: { displayName: 'Opus Display', requestModel: 'opus-model' },
      fable: { displayName: 'Fable Display', requestModel: 'fable-model' },
      haiku: { displayName: 'Haiku Display', requestModel: 'haiku-model' },
      subagent: { requestModel: 'subagent-model' },
      defaultFallbackModel: 'fallback-model',
    },
  };
}

function createPreviewer(
  provider: ProviderDetail | undefined,
  readTextFile: (filename: string) => Promise<string>,
) {
  return new RuntimeConfigurationPreviewer(
    '/Users/example',
    {
      getProviderForEdit: (id) => {
        if (provider === undefined || id !== provider.id) {
          throw new RuntimeOperationError('not-found', 'Provider was not found.');
        }
        return provider;
      },
    },
    readTextFile,
  );
}

async function assertRuntimeError(
  operation: () => Promise<unknown>,
  code: RuntimeApiErrorCode,
): Promise<RuntimeOperationError> {
  let caught: RuntimeOperationError | undefined;
  await assert.rejects(operation, (error: unknown) => {
    if (!(error instanceof RuntimeOperationError)) {
      return false;
    }
    caught = error;
    return error.code === code;
  });
  assert.ok(caught);
  return caught;
}

test('reuses the active Codex custom Provider key without exposing secrets', async () => {
  const provider = createCodexProvider();
  const previewer = createPreviewer(provider, (filename) => {
    assert.equal(filename, '/Users/example/.codex/config.toml');
    return Promise.resolve(`
model = "old-model"
model_provider = "zode"
unrelated = "preserve me"

[model_providers.other]
name = "Other"

[model_providers.zode]
name = "Codex Proxy"
base_url = "https://old.example.com"
wire_api = "responses"
experimental_bearer_token = "codex-plaintext-secret-7890"
unknown = "preserve me"
`);
  });

  const preview = await previewer.preview({
    runtime: 'codex',
    target: { kind: 'provider', providerId: provider.id },
  });

  assert.equal(preview.file.path, '~/.codex/config.toml');
  assert.equal(preview.file.exists, true);
  assert.equal(preview.target.kind, 'provider');
  assert.deepEqual(
    preview.fields.map(({ key, operation }) => ({ key, operation })),
    [
      { key: 'model', operation: 'update' },
      { key: 'model_provider', operation: 'no-change' },
      { key: 'forced_login_method', operation: 'add' },
      { key: 'model_providers.zode.name', operation: 'no-change' },
      { key: 'model_providers.zode.base_url', operation: 'update' },
      { key: 'model_providers.zode.wire_api', operation: 'no-change' },
      {
        key: 'model_providers.zode.experimental_bearer_token',
        operation: 'no-change',
      },
    ],
  );
  const secret = preview.fields.at(-1);
  assert.ok(secret);
  assert.deepEqual(secret.current, { kind: 'secret', configured: true, suffix: null });
  assert.deepEqual(secret.proposed, { kind: 'secret', configured: true, suffix: '7890' });
  assert.equal(JSON.stringify(preview).includes('codex-plaintext-secret-7890'), false);
  assert.equal(JSON.stringify(preview).includes('preserve me'), false);
});

test('reuses the sole Codex custom Provider table when the active Provider is built-in', async () => {
  const provider = createCodexProvider();
  const previewer = createPreviewer(provider, () => Promise.resolve(`
model = "gpt-5"
model_provider = "openai"

[model_providers.other]
name = "Other"
`));

  const plan = await previewer.createPlan({
    runtime: 'codex',
    target: { kind: 'provider', providerId: provider.id },
  });

  assert.equal(plan.configurationProviderKey, 'other');
  assert.equal(plan.fields[1].proposedValue, 'other');
  assert.deepEqual(plan.fields.slice(3).map((field) => field.key), [
    'model_providers.other.name',
    'model_providers.other.base_url',
    'model_providers.other.wire_api',
    'model_providers.other.experimental_bearer_token',
  ]);
});

test('falls back to foundry_managed when Codex has no reusable custom Provider', async () => {
  const provider = createCodexProvider();
  const previewer = createPreviewer(provider, () => Promise.resolve(`
model = "gpt-5"
model_provider = "openai"
`));

  const plan = await previewer.createPlan({
    runtime: 'codex',
    target: { kind: 'provider', providerId: provider.id },
  });

  assert.equal(plan.configurationProviderKey, 'foundry_managed');
  assert.equal(plan.fields[1].proposedValue, 'foundry_managed');
});

test('rejects an ambiguous Codex custom Provider table selection', async () => {
  const provider = createCodexProvider();
  const previewer = createPreviewer(provider, () => Promise.resolve(`
[model_providers.first]
name = "First"

[model_providers.second]
name = "Second"
`));

  await assertRuntimeError(
    () => previewer.preview({
      runtime: 'codex',
      target: { kind: 'provider', providerId: provider.id },
    }),
    'configuration-invalid',
  );
});

test('does not resolve or change a Codex Provider table for Official Default', async () => {
  const previewer = createPreviewer(undefined, () => Promise.resolve(`
[model_providers.custom]
name = "Custom"
base_url = "https://custom.example.com/v1"
wire_api = "responses"
`));

  const plan = await previewer.createPlan({
    runtime: 'codex',
    target: { kind: 'official-default' },
  });

  assert.equal(plan.configurationProviderKey, null);
  assert.deepEqual(plan.fields.map((field) => field.key), [
    'model',
    'model_provider',
    'forced_login_method',
  ]);
  assert.ok(plan.fields.every((field) => field.currentValue === undefined));
  assert.ok(plan.fields.every((field) => field.proposedValue === undefined));
});

test('previews every Claude Code env mapping and removes an absent Provider key', async () => {
  const provider = createClaudeProvider();
  const previewer = createPreviewer(provider, (filename) => {
    assert.equal(filename, '/Users/example/.claude/settings.json');
    return Promise.resolve(JSON.stringify({
      theme: 'dark',
      env: {
        UNRELATED: 'preserve me',
        ANTHROPIC_AUTH_TOKEN: 'existing-disk-secret',
        ANTHROPIC_MODEL: 'fallback-model',
      },
    }));
  });

  const preview = await previewer.preview({
    runtime: 'claude-code',
    target: { kind: 'provider', providerId: provider.id },
  });

  assert.equal(preview.fields.length, 12);
  assert.deepEqual(preview.fields.map((field) => field.key), [
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
  ]);
  const secret = preview.fields[1];
  assert.equal(secret.operation, 'remove');
  assert.deepEqual(secret.current, { kind: 'secret', configured: true, suffix: null });
  assert.deepEqual(secret.proposed, { kind: 'secret', configured: false, suffix: null });
  assert.equal(JSON.stringify(preview).includes('existing-disk-secret'), false);
  assert.equal(JSON.stringify(preview).includes('preserve me'), false);
});

test('treats a missing file as empty for Official Default', async () => {
  const previewer = createPreviewer(
    undefined,
    () => Promise.reject(Object.assign(new Error('missing'), { code: 'ENOENT' })),
  );
  const preview = await previewer.preview({
    runtime: 'codex',
    target: { kind: 'official-default' },
  });

  assert.equal(preview.file.exists, false);
  assert.equal(preview.target.kind, 'official-default');
  assert.ok(preview.fields.every((field) => field.operation === 'no-change'));
});

test('previews removal of only Codex selection values for Official Default', async () => {
  const previewer = createPreviewer(undefined, () => Promise.resolve(`
model = "custom-model"
model_provider = "zode"
forced_login_method = "api"
approval_policy = "on-request"

[model_providers.zode]
name = "Managed Provider"
base_url = "https://managed.example.com"
wire_api = "responses"
experimental_bearer_token = "disk-secret"
unowned = "preserve me"
`));
  const preview = await previewer.preview({
    runtime: 'codex',
    target: { kind: 'official-default' },
  });

  assert.deepEqual(
    preview.fields.map(({ key, operation }) => ({ key, operation })),
    [
      { key: 'model', operation: 'remove' },
      { key: 'model_provider', operation: 'remove' },
      { key: 'forced_login_method', operation: 'remove' },
    ],
  );
  assert.equal(JSON.stringify(preview).includes('disk-secret'), false);
  assert.equal(JSON.stringify(preview).includes('preserve me'), false);
  assert.equal(JSON.stringify(preview).includes('approval_policy'), false);
});

test('rejects malformed, unreadable, and structurally conflicting configuration', async () => {
  const malformed = createPreviewer(undefined, () => Promise.resolve('model = ['));
  await assertRuntimeError(
    () => malformed.preview({ runtime: 'codex', target: { kind: 'official-default' } }),
    'configuration-invalid',
  );

  const unreadable = createPreviewer(
    undefined,
    () => Promise.reject(Object.assign(
      new Error('contains /Users/example and a secret'),
      { code: 'EACCES' },
    )),
  );
  const unavailableError = await assertRuntimeError(
    () => unreadable.preview({
      runtime: 'claude-code',
      target: { kind: 'official-default' },
    }),
    'configuration-unavailable',
  );
  assert.equal(unavailableError.message.includes('/Users/example'), false);
  assert.equal(unavailableError.message.includes('secret'), false);

  const conflicting = createPreviewer(
    undefined,
    () => Promise.resolve(JSON.stringify({ env: [] })),
  );
  await assertRuntimeError(
    () => conflicting.preview({
      runtime: 'claude-code',
      target: { kind: 'official-default' },
    }),
    'configuration-invalid',
  );
});

test('rejects invalid targets and Runtime-mismatched Providers before file access', async () => {
  let readCount = 0;
  const provider = createClaudeProvider();
  const previewer = createPreviewer(provider, () => {
    readCount += 1;
    return Promise.resolve('{}');
  });

  await assertRuntimeError(
    () => previewer.preview({ runtime: 'codex', target: { kind: 'provider', providerId: 'bad' } }),
    'invalid-input',
  );
  await assertRuntimeError(
    () => previewer.preview({
      runtime: 'codex',
      target: { kind: 'provider', providerId: provider.id },
    }),
    'invalid-input',
  );
  assert.equal(readCount, 0);
});
