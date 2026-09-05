import type { Provider } from '@dhzh/foundry-api-contract';
import { parse as parseToml } from '@decimalturn/toml-patch';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';

import { RuntimeConfigurationManager } from '../src/server/runtimes/configuration/manager';
import { RuntimeOperationError } from '../src/server/runtimes/error';

const temporaryRoots: string[] = [];

async function createRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'foundry-runtime-configuration-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })));
});

const codexProvider: Extract<Provider, { runtime: 'codex' }> = {
  avatar: null,
  configuration: {
    apiKey: 'codex-secret',
    baseUrl: 'https://gateway.example/v1',
    primaryModel: 'primary-model',
    protocol: 'responses',
    reviewModel: 'review-model',
  },
  createdAt: 1,
  id: 'codex-provider',
  name: 'Gateway',
  officialWebsite: null,
  remark: null,
  runtime: 'codex',
  updatedAt: 1,
};

const claudeProvider: Extract<Provider, { runtime: 'claude-code' }> = {
  avatar: null,
  configuration: {
    apiKey: 'claude-secret',
    apiKeyHeader: 'x-api-key',
    baseUrl: 'https://gateway.example',
    fableModel: null,
    haikuModel: null,
    opusModel: {
      description: 'Strong model',
      displayName: 'Opus Custom',
      model: 'opus-custom',
      supportedCapabilities: ['thinking', 'max_effort'],
    },
    primaryModel: {
      description: null,
      displayName: 'Primary Custom',
      model: 'primary-custom',
      supportedCapabilities: [],
    },
    protocol: 'messages',
    sonnetModel: null,
    subagentModel: 'subagent-custom',
  },
  createdAt: 1,
  id: 'claude-provider',
  name: 'Claude Gateway',
  officialWebsite: null,
  remark: null,
  runtime: 'claude-code',
  updatedAt: 1,
};

it('uses foundry when Codex has no nested Provider table and preserves formatting', async () => {
  const root = await createRoot();
  const filename = path.join(root, '.codex', 'config.toml');
  await mkdir(path.dirname(filename), { recursive: true });
  const source = '# keep this comment\napproval_policy = "on-request"\n\n[model_providers]\nlabel = "ignore me"\n';
  await writeFile(filename, source, { mode: 0o640 });
  const manager = new RuntimeConfigurationManager();

  const preview = await manager.preview(
    'codex',
    filename,
    { kind: 'provider', providerId: codexProvider.id },
    codexProvider,
  );

  expect(preview).toMatchObject({ kind: 'ready', providerKey: 'foundry' });
  if (preview.kind !== 'ready') {
    throw new Error('Expected a ready Preview.');
  }
  expect(preview.changes.map((field) => field.key)).toContain(
    '[model_providers.foundry].base_url',
  );
  await manager.apply(
    'codex',
    filename,
    preview.target,
    codexProvider,
    preview.file.hash,
  );

  const content = await readFile(filename, 'utf8');
  expect(content).toContain('# keep this comment');
  expect(content).toContain('approval_policy = "on-request"');
  expect(content).toContain('label = "ignore me"');
  const appliedFile = await stat(filename);
  expect(appliedFile.mode & 0o777).toBe(0o640);
  expect(parseToml(content)).toMatchObject({
    model: 'primary-model',
    model_provider: 'foundry',
    model_providers: {
      foundry: {
        base_url: 'https://gateway.example/v1',
        experimental_bearer_token: 'codex-secret',
        name: 'Gateway',
        wire_api: 'responses',
      },
      label: 'ignore me',
    },
    review_model: 'review-model',
  });
});

it('reuses one Codex Provider key and overwrites wrong managed value types', async () => {
  const root = await createRoot();
  const filename = path.join(root, 'config.toml');
  await writeFile(filename, [
    'model = 42',
    '[model_providers.existing]',
    'base_url = false',
    'custom = "preserved"',
    '',
  ].join('\n'));
  const manager = new RuntimeConfigurationManager();
  const preview = await manager.preview(
    'codex',
    filename,
    { kind: 'provider', providerId: codexProvider.id },
    codexProvider,
  );

  expect(preview).toMatchObject({ kind: 'ready', providerKey: 'existing' });
  if (preview.kind !== 'ready') {
    throw new Error('Expected a ready Preview.');
  }
  expect(preview.changes).toContainEqual(expect.objectContaining({
    current: { kind: 'plain', value: '42' },
    key: 'model',
    operation: 'update',
  }));
  await manager.apply(
    'codex',
    filename,
    preview.target,
    codexProvider,
    preview.file.hash,
  );
  expect(parseToml(await readFile(filename, 'utf8'))).toMatchObject({
    model: 'primary-model',
    model_provider: 'existing',
    model_providers: { existing: { custom: 'preserved' } },
  });
});

it('requires a user choice when Codex has multiple Provider keys', async () => {
  const root = await createRoot();
  const filename = path.join(root, 'config.toml');
  await writeFile(filename, '[model_providers.first]\nname="First"\n[model_providers.second]\nname="Second"\n');
  const manager = new RuntimeConfigurationManager();
  const target = { kind: 'provider', providerId: codexProvider.id } as const;

  await expect(manager.preview('codex', filename, target, codexProvider))
    .resolves
    .toMatchObject({
      kind: 'provider-key-selection',
      providerKeys: ['first', 'second'],
    });
  await expect(manager.preview('codex', filename, target, codexProvider, 'second'))
    .resolves
    .toMatchObject({ kind: 'ready', providerKey: 'second' });
});

it('restores Codex Official Default without deleting Provider tables', async () => {
  const root = await createRoot();
  const filename = path.join(root, 'config.toml');
  await writeFile(filename, [
    'model = "custom"',
    'review_model = "review"',
    'model_provider = "existing"',
    'forced_login_method = "chatgpt"',
    '[model_providers.existing]',
    'base_url = "https://example.com"',
    '',
  ].join('\n'));
  const manager = new RuntimeConfigurationManager();
  const target = { kind: 'official-default' } as const;
  const preview = await manager.preview('codex', filename, target, null);
  if (preview.kind !== 'ready') {
    throw new Error('Expected a ready Preview.');
  }
  await manager.apply('codex', filename, target, null, preview.file.hash);

  expect(parseToml(await readFile(filename, 'utf8'))).toEqual({
    forced_login_method: 'chatgpt',
    model_providers: {
      existing: { base_url: 'https://example.com' },
    },
  });
});

it('writes Claude managed env fields and removes only those fields for Official Default', async () => {
  const root = await createRoot();
  const filename = path.join(root, '.claude', 'settings.json');
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, `${JSON.stringify({
    env: {
      ANTHROPIC_AUTH_TOKEN: 'old-secret',
      KEEP_ME: 'yes',
    },
    permissions: { allow: ['Read'] },
  }, null, '\t')}\n`);
  const manager = new RuntimeConfigurationManager();
  const providerTarget = { kind: 'provider', providerId: claudeProvider.id } as const;
  const providerPreview = await manager.preview(
    'claude-code',
    filename,
    providerTarget,
    claudeProvider,
  );
  if (providerPreview.kind !== 'ready') {
    throw new Error('Expected a ready Preview.');
  }
  expect(providerPreview.changes).toContainEqual(expect.objectContaining({
    key: 'env.ANTHROPIC_API_KEY',
    proposed: { kind: 'secret', value: 'claude-secret' },
  }));
  await manager.apply(
    'claude-code',
    filename,
    providerTarget,
    claudeProvider,
    providerPreview.file.hash,
  );
  const applied = JSON.parse(await readFile(filename, 'utf8'));
  expect(applied).toMatchObject({
    env: {
      ANTHROPIC_API_KEY: 'claude-secret',
      ANTHROPIC_BASE_URL: 'https://gateway.example',
      ANTHROPIC_DEFAULT_MODEL: 'primary-custom',
      ANTHROPIC_DEFAULT_MODEL_NAME: 'Primary Custom',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'opus-custom',
      ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION: 'Strong model',
      ANTHROPIC_DEFAULT_OPUS_MODEL_NAME: 'Opus Custom',
      ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES: 'thinking,max_effort',
      CLAUDE_CODE_SUBAGENT_MODEL: 'subagent-custom',
      KEEP_ME: 'yes',
    },
    permissions: { allow: ['Read'] },
  });
  expect(applied.env).not.toHaveProperty('ANTHROPIC_AUTH_TOKEN');

  const officialTarget = { kind: 'official-default' } as const;
  const officialPreview = await manager.preview(
    'claude-code',
    filename,
    officialTarget,
    null,
  );
  if (officialPreview.kind !== 'ready') {
    throw new Error('Expected a ready Preview.');
  }
  await manager.apply(
    'claude-code',
    filename,
    officialTarget,
    null,
    officialPreview.file.hash,
  );
  expect(JSON.parse(await readFile(filename, 'utf8'))).toEqual({
    env: { KEEP_ME: 'yes' },
    permissions: { allow: ['Read'] },
  });
});

it('rejects a changed file and supports rollback with a latest backup', async () => {
  const root = await createRoot();
  const filename = path.join(root, 'config.toml');
  await writeFile(filename, 'model = "before"\n');
  const manager = new RuntimeConfigurationManager();
  const target = { kind: 'provider', providerId: codexProvider.id } as const;
  const preview = await manager.preview('codex', filename, target, codexProvider);
  if (preview.kind !== 'ready') {
    throw new Error('Expected a ready Preview.');
  }
  await writeFile(filename, 'model = "external"\n');

  await expect(manager.apply(
    'codex',
    filename,
    target,
    codexProvider,
    preview.file.hash,
  )).rejects.toEqual(new RuntimeOperationError(
    'RUNTIME_CONFIGURATION_CHANGED',
    'The Runtime configuration changed after Preview. Refresh and review it again.',
  ));

  const refreshed = await manager.preview('codex', filename, target, codexProvider);
  if (refreshed.kind !== 'ready') {
    throw new Error('Expected a ready Preview.');
  }
  const change = await manager.apply(
    'codex',
    filename,
    target,
    codexProvider,
    refreshed.file.hash,
  );
  expect(await readFile(`${filename}.foundry-backup`, 'utf8'))
    .toBe('model = "external"\n');
  const backupFile = await stat(`${filename}.foundry-backup`);
  expect(backupFile.mode & 0o777).toBe(0o600);
  await change.rollback();
  expect(await readFile(filename, 'utf8')).toBe('model = "external"\n');
});

it('creates and removes a new configuration file during rollback', async () => {
  const root = await createRoot();
  const filename = path.join(root, '.claude', 'settings.json');
  const manager = new RuntimeConfigurationManager();
  const target = { kind: 'provider', providerId: claudeProvider.id } as const;
  const preview = await manager.preview('claude-code', filename, target, claudeProvider);
  if (preview.kind !== 'ready') {
    throw new Error('Expected a ready Preview.');
  }
  const change = await manager.apply(
    'claude-code',
    filename,
    target,
    claudeProvider,
    preview.file.hash,
  );
  const createdFile = await stat(filename);
  expect(createdFile.mode & 0o777).toBe(0o600);
  await change.rollback();
  await expect(stat(filename)).rejects.toMatchObject({ code: 'ENOENT' });
});
