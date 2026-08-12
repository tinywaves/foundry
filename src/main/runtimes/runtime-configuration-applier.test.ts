import assert from 'node:assert/strict';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parse as parseToml } from '@decimalturn/toml-patch';
import { test } from 'vitest';
import type { ProviderDetail } from '../../shared/provider-contract';
import type {
  RuntimeConfigurationPreviewInput,
  RuntimeSummary,
} from '../../shared/runtime-contract';
import { RuntimeConfigurationApplier } from './runtime-configuration-applier';
import type { RuntimeConfigurationFileOperations } from './runtime-configuration-applier';
import { RuntimeConfigurationPreviewer } from './runtime-configuration-previewer';
import { RuntimeOperationError } from './runtime-error';

const codexProviderId = '00000000-0000-4000-8000-000000000001';
const claudeProviderId = '00000000-0000-4000-8000-000000000002';

function createCodexProvider(): Extract<ProviderDetail, { runtime: 'codex' }> {
  return {
    id: codexProviderId,
    runtime: 'codex',
    source: 'user-custom',
    name: 'Managed Codex',
    baseUrl: 'https://codex.example.com/v1',
    apiKey: 'codex-secret-1234',
    hasApiKey: true,
    apiKeySuffix: '1234',
    remark: null,
    officialWebsite: null,
    hasCustomAvatar: false,
    isInUse: false,
    connection: { status: 'never-tested', lastTestedAt: null, lastError: null },
    modelConfig: { version: 1, defaultModel: 'gpt-foundry' },
    createdAt: 1,
    updatedAt: 1,
  };
}

function createClaudeProvider(): Extract<ProviderDetail, { runtime: 'claude-code' }> {
  return {
    id: claudeProviderId,
    runtime: 'claude-code',
    source: 'user-custom',
    name: 'Managed Claude',
    baseUrl: 'https://claude.example.com',
    apiKey: 'claude-secret-5678',
    hasApiKey: true,
    apiKeySuffix: '5678',
    remark: null,
    officialWebsite: null,
    hasCustomAvatar: false,
    isInUse: false,
    connection: { status: 'never-tested', lastTestedAt: null, lastError: null },
    modelConfig: {
      version: 1,
      sonnet: { displayName: 'Sonnet', requestModel: 'claude-sonnet' },
      opus: { displayName: 'Opus', requestModel: 'claude-opus' },
      fable: { displayName: 'Fable', requestModel: 'claude-fable' },
      haiku: { displayName: 'Haiku', requestModel: 'claude-haiku' },
      subagent: { requestModel: 'claude-subagent' },
      defaultFallbackModel: 'claude-fallback',
    },
    createdAt: 1,
    updatedAt: 1,
  };
}

function createPreviewer(home: string, providers: ProviderDetail[]) {
  return new RuntimeConfigurationPreviewer(home, {
    getProviderForEdit: (id) => {
      const provider = providers.find((entry) => entry.id === id);
      if (!provider) {
        throw new RuntimeOperationError('not-found', 'Provider was not found.');
      }
      return provider;
    },
  });
}

function createRecorder(options: { fail?: boolean } = {}) {
  const calls: RuntimeConfigurationPreviewInput[] = [];
  const record = (
    runtime: RuntimeConfigurationPreviewInput['runtime'],
    target: RuntimeConfigurationPreviewInput['target'],
  ): RuntimeSummary => {
    calls.push({ runtime, target });
    if (options.fail) {
      throw new RuntimeOperationError('storage-unavailable', 'Runtime storage is unavailable.');
    }
    return target.kind === 'provider'
      ? { runtime, status: 'provider', providerId: target.providerId, appliedAt: 10 }
      : { runtime, status: 'official-default', providerId: null, appliedAt: 10 };
  };
  return {
    calls,
    recorder: {
      recordProviderApplication: (runtime: unknown, providerId: unknown) => record(
        runtime as RuntimeConfigurationPreviewInput['runtime'],
        { kind: 'provider', providerId: providerId as string },
      ),
      recordOfficialDefaultApplication: (runtime: unknown) => record(
        runtime as RuntimeConfigurationPreviewInput['runtime'],
        { kind: 'official-default' },
      ),
    },
  };
}

async function createTemporaryHome(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'foundry-runtime-apply-'));
}

async function removeTemporaryHome(home: string): Promise<void> {
  await rm(home, { recursive: true, force: true });
}

async function removeFileIfExists(filename: string): Promise<void> {
  try {
    await unlink(filename);
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined;
    if (code !== 'ENOENT') {
      throw error;
    }
  }
}

test('applies and restores Codex while preserving content and replacing the latest backup', async () => {
  const home = await createTemporaryHome();
  const configurationDirectory = path.join(home, '.codex');
  const configurationPath = path.join(configurationDirectory, 'config.toml');
  const original = `# Keep this comment\nmodel = "old-model"\nmodel_provider = "custom"\napproval_policy = "on-request"\n\n[model_providers.custom]\nname    = "Old Name" # keep spacing\nbase_url = "https://old.example.com"\nwire_api = "responses"\nexperimental_bearer_token = "old-secret"\nunowned = "keep me"\n`;
  await mkdir(configurationDirectory, { recursive: true });
  await writeFile(configurationPath, original);
  const { calls, recorder } = createRecorder();
  const provider = createCodexProvider();
  const applier = new RuntimeConfigurationApplier(
    createPreviewer(home, [provider]),
    recorder,
  );

  try {
    const summary = await applier.apply({
      runtime: 'codex',
      target: { kind: 'provider', providerId: codexProviderId },
    });
    const updated = await readFile(configurationPath, 'utf8');
    const parsed = parseToml(updated) as Record<string, unknown>;
    const modelProviders = parsed.model_providers as Record<string, Record<string, unknown>>;

    assert.equal(summary.status, 'provider');
    assert.equal(parsed.model_provider, 'custom');
    assert.equal(parsed.model, 'gpt-foundry');
    assert.equal(parsed.approval_policy, 'on-request');
    assert.equal(modelProviders.custom.unowned, 'keep me');
    assert.equal(modelProviders.custom.base_url, 'https://codex.example.com/v1');
    assert.equal(modelProviders.custom.experimental_bearer_token, 'codex-secret-1234');
    assert.ok(updated.includes('# Keep this comment'));
    assert.ok(updated.includes('name    = "Managed Codex" # keep spacing'));
    assert.equal(
      await readFile(`${configurationPath}.foundry-backup`, 'utf8'),
      original,
    );

    provider.modelConfig.defaultModel = 'gpt-next';
    await applier.apply({
      runtime: 'codex',
      target: { kind: 'provider', providerId: codexProviderId },
    });
    const secondVersion = await readFile(configurationPath, 'utf8');
    assert.equal((parseToml(secondVersion) as Record<string, unknown>).model, 'gpt-next');
    assert.equal(await readFile(`${configurationPath}.foundry-backup`, 'utf8'), updated);

    await applier.apply({
      runtime: 'codex',
      target: { kind: 'official-default' },
    });
    const restored = parseToml(await readFile(configurationPath, 'utf8')) as Record<
      string,
      unknown
    >;
    const restoredProviders = restored.model_providers as Record<
      string,
      Record<string, unknown>
    >;
    assert.equal(restored.model, undefined);
    assert.equal(restored.model_provider, undefined);
    assert.equal(restored.forced_login_method, undefined);
    assert.equal(restoredProviders.custom.name, 'Managed Codex');
    assert.equal(restoredProviders.custom.base_url, 'https://codex.example.com/v1');
    assert.equal(restoredProviders.custom.wire_api, 'responses');
    assert.equal(
      restoredProviders.custom.experimental_bearer_token,
      'codex-secret-1234',
    );
    assert.equal(restoredProviders.custom.unowned, 'keep me');
    assert.equal(await readFile(`${configurationPath}.foundry-backup`, 'utf8'), secondVersion);

    await applier.apply({
      runtime: 'codex',
      target: { kind: 'provider', providerId: codexProviderId },
    });
    const reapplied = parseToml(await readFile(configurationPath, 'utf8')) as Record<
      string,
      unknown
    >;
    assert.equal(reapplied.model_provider, 'custom');
    assert.equal(
      (reapplied.model_providers as Record<string, unknown>).foundry_managed,
      undefined,
    );

    const configurationStat = await stat(configurationPath);
    const backupStat = await stat(`${configurationPath}.foundry-backup`);
    assert.equal(configurationStat.mode & 0o777, 0o600);
    assert.equal(backupStat.mode & 0o777, 0o600);
    assert.deepEqual(calls, [
      {
        runtime: 'codex',
        target: { kind: 'provider', providerId: codexProviderId },
      },
      {
        runtime: 'codex',
        target: { kind: 'provider', providerId: codexProviderId },
      },
      {
        runtime: 'codex',
        target: { kind: 'official-default' },
      },
      {
        runtime: 'codex',
        target: { kind: 'provider', providerId: codexProviderId },
      },
    ]);
    const directoryEntries = await readdir(configurationDirectory);
    assert.equal(
      directoryEntries.some((name) => name.endsWith('.tmp')),
      false,
    );
  } finally {
    await removeTemporaryHome(home);
  }
});

test('reuses the sole existing Codex Provider table when model_provider is absent', async () => {
  const home = await createTemporaryHome();
  const configurationDirectory = path.join(home, '.codex');
  const configurationPath = path.join(configurationDirectory, 'config.toml');
  const original = `# Keep this comment\napproval_policy = "on-request"\n\n[model_providers.custom]\nname = "Custom" # keep this too\nbase_url = "https://custom.example.com/v1"\nwire_api = "responses"\n`;
  await mkdir(configurationDirectory, { recursive: true });
  await writeFile(configurationPath, original);
  const { recorder } = createRecorder();
  const provider = createCodexProvider();
  const applier = new RuntimeConfigurationApplier(
    createPreviewer(home, [provider]),
    recorder,
  );

  try {
    await applier.apply({
      runtime: 'codex',
      target: { kind: 'provider', providerId: codexProviderId },
    });
    const updated = await readFile(configurationPath, 'utf8');
    const parsed = parseToml(updated) as Record<string, unknown>;
    const modelProviders = parsed.model_providers as Record<
      string,
      Record<string, unknown>
    >;

    assert.equal(parsed.model_provider, 'custom');
    assert.equal(parsed.foundry_managed, undefined);
    assert.equal(modelProviders.custom.name, 'Managed Codex');
    assert.equal(
      modelProviders.custom.base_url,
      'https://codex.example.com/v1',
    );
    assert.equal(
      modelProviders.custom.experimental_bearer_token,
      'codex-secret-1234',
    );
    assert.equal(modelProviders.foundry_managed, undefined);
    assert.ok(updated.includes('# Keep this comment'));
    assert.ok(updated.includes('name = "Managed Codex" # keep this too'));
  } finally {
    await removeTemporaryHome(home);
  }
});

test('reuses the sole existing Codex Provider table regardless of its key', async () => {
  const home = await createTemporaryHome();
  const configurationDirectory = path.join(home, '.codex');
  const configurationPath = path.join(configurationDirectory, 'config.toml');
  const original = `model_provider = "openai"\n\n[model_providers.openai]\nname = "OpenAI"\nunowned = "keep me"\n`;
  await mkdir(configurationDirectory, { recursive: true });
  await writeFile(configurationPath, original);
  const { recorder } = createRecorder();
  const applier = new RuntimeConfigurationApplier(
    createPreviewer(home, [createCodexProvider()]),
    recorder,
  );

  try {
    await applier.apply({
      runtime: 'codex',
      target: { kind: 'provider', providerId: codexProviderId },
    });
    const parsed = parseToml(await readFile(configurationPath, 'utf8')) as Record<
      string,
      unknown
    >;
    const modelProviders = parsed.model_providers as Record<
      string,
      Record<string, unknown>
    >;

    assert.equal(parsed.model_provider, 'openai');
    assert.equal(modelProviders.openai.name, 'Managed Codex');
    assert.equal(modelProviders.openai.unowned, 'keep me');
    assert.equal(modelProviders.openai.base_url, 'https://codex.example.com/v1');
    assert.equal(modelProviders.foundry_managed, undefined);
    assert.equal(parsed.foundry_managed, undefined);
  } finally {
    await removeTemporaryHome(home);
  }
});

test('creates foundry_managed only when Codex has no Provider table', async () => {
  const home = await createTemporaryHome();
  const configurationDirectory = path.join(home, '.codex');
  const configurationPath = path.join(configurationDirectory, 'config.toml');
  await mkdir(configurationDirectory, { recursive: true });
  await writeFile(configurationPath, 'approval_policy = "on-request"\n');
  const { recorder } = createRecorder();
  const applier = new RuntimeConfigurationApplier(
    createPreviewer(home, [createCodexProvider()]),
    recorder,
  );

  try {
    await applier.apply({
      runtime: 'codex',
      target: { kind: 'provider', providerId: codexProviderId },
    });
    const parsed = parseToml(await readFile(configurationPath, 'utf8')) as Record<
      string,
      unknown
    >;
    const modelProviders = parsed.model_providers as Record<
      string,
      Record<string, unknown>
    >;

    assert.equal(parsed.model_provider, 'foundry_managed');
    assert.deepEqual(Object.keys(modelProviders), ['foundry_managed']);
    assert.equal(modelProviders.foundry_managed.name, 'Managed Codex');
  } finally {
    await removeTemporaryHome(home);
  }
});

test('creates foundry_managed inside an existing empty Codex model_providers table', async () => {
  const home = await createTemporaryHome();
  const configurationDirectory = path.join(home, '.codex');
  const configurationPath = path.join(configurationDirectory, 'config.toml');
  await mkdir(configurationDirectory, { recursive: true });
  await writeFile(configurationPath, 'model_providers = {}\n');
  const { recorder } = createRecorder();
  const applier = new RuntimeConfigurationApplier(
    createPreviewer(home, [createCodexProvider()]),
    recorder,
  );

  try {
    await applier.apply({
      runtime: 'codex',
      target: { kind: 'provider', providerId: codexProviderId },
    });
    const parsed = parseToml(await readFile(configurationPath, 'utf8')) as Record<
      string,
      unknown
    >;
    const modelProviders = parsed.model_providers as Record<
      string,
      Record<string, unknown>
    >;

    assert.equal(parsed.model_provider, 'foundry_managed');
    assert.deepEqual(Object.keys(modelProviders), ['foundry_managed']);
    assert.equal(modelProviders.foundry_managed.name, 'Managed Codex');
    assert.equal(parsed.foundry_managed, undefined);
  } finally {
    await removeTemporaryHome(home);
  }
});

test('switches Codex Providers by updating the same configuration Provider key', async () => {
  const home = await createTemporaryHome();
  const configurationDirectory = path.join(home, '.codex');
  const configurationPath = path.join(configurationDirectory, 'config.toml');
  const original = '[model_providers.custom]\nname = "Original"\n';
  await mkdir(configurationDirectory, { recursive: true });
  await writeFile(configurationPath, original);
  const firstProvider = createCodexProvider();
  const secondProvider: Extract<ProviderDetail, { runtime: 'codex' }> = {
    ...createCodexProvider(),
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Second Codex',
    baseUrl: 'https://second.example.com/v1',
    apiKey: 'second-secret-9876',
    apiKeySuffix: '9876',
    modelConfig: { version: 1, defaultModel: 'gpt-second' },
  };
  const { recorder } = createRecorder();
  const applier = new RuntimeConfigurationApplier(
    createPreviewer(home, [firstProvider, secondProvider]),
    recorder,
  );

  try {
    await applier.apply({
      runtime: 'codex',
      target: { kind: 'provider', providerId: firstProvider.id },
    });
    await applier.apply({
      runtime: 'codex',
      target: { kind: 'provider', providerId: secondProvider.id },
    });
    const parsed = parseToml(await readFile(configurationPath, 'utf8')) as Record<
      string,
      unknown
    >;
    const modelProviders = parsed.model_providers as Record<
      string,
      Record<string, unknown>
    >;

    assert.equal(parsed.model, 'gpt-second');
    assert.equal(parsed.model_provider, 'custom');
    assert.deepEqual(Object.keys(modelProviders), ['custom']);
    assert.equal(modelProviders.custom.name, 'Second Codex');
    assert.equal(modelProviders.custom.base_url, 'https://second.example.com/v1');
    assert.equal(modelProviders.custom.experimental_bearer_token, 'second-secret-9876');
  } finally {
    await removeTemporaryHome(home);
  }
});

test('restores Claude Code managed fields while preserving JSON style and unowned values', async () => {
  const home = await createTemporaryHome();
  const configurationDirectory = path.join(home, '.claude');
  const configurationPath = path.join(configurationDirectory, 'settings.json');
  const original = '{\r\n    "theme": "dark",\r\n    "env": {\r\n        "UNOWNED": "keep",\r\n        "ANTHROPIC_BASE_URL": "https://old.example.com",\r\n        "ANTHROPIC_AUTH_TOKEN": "disk-secret"\r\n    }\r\n}\r\n';
  await mkdir(configurationDirectory, { recursive: true });
  await writeFile(configurationPath, original);
  const { recorder } = createRecorder();
  const applier = new RuntimeConfigurationApplier(createPreviewer(home, []), recorder);

  try {
    const summary = await applier.apply({
      runtime: 'claude-code',
      target: { kind: 'official-default' },
    });
    const updated = await readFile(configurationPath, 'utf8');
    const parsed = JSON.parse(updated) as Record<string, unknown>;

    assert.equal(summary.status, 'official-default');
    assert.deepEqual(parsed, { theme: 'dark', env: { UNOWNED: 'keep' } });
    assert.ok(updated.includes('\r\n    "theme"'));
    assert.ok(updated.endsWith('\r\n'));
    assert.equal(updated.replaceAll('\r\n', '').includes('\n'), false);
    assert.equal(await readFile(`${configurationPath}.foundry-backup`, 'utf8'), original);
  } finally {
    await removeTemporaryHome(home);
  }
});

test('applies only managed Claude Code env fields and preserves unrelated settings', async () => {
  const home = await createTemporaryHome();
  const configurationDirectory = path.join(home, '.claude');
  const configurationPath = path.join(configurationDirectory, 'settings.json');
  await mkdir(configurationDirectory, { recursive: true });
  await writeFile(configurationPath, JSON.stringify({
    theme: 'dark',
    env: {
      UNRELATED: 'keep me',
      ANTHROPIC_BASE_URL: 'https://old.example.com',
      ANTHROPIC_AUTH_TOKEN: 'old-secret',
    },
  }, null, 2));
  const { recorder } = createRecorder();
  const applier = new RuntimeConfigurationApplier(
    createPreviewer(home, [createClaudeProvider()]),
    recorder,
  );

  try {
    await applier.apply({
      runtime: 'claude-code',
      target: { kind: 'provider', providerId: claudeProviderId },
    });
    const parsed = JSON.parse(await readFile(configurationPath, 'utf8')) as {
      theme: string;
      env: Record<string, string>;
    };

    assert.equal(parsed.theme, 'dark');
    assert.equal(parsed.env.UNRELATED, 'keep me');
    assert.equal(parsed.env.ANTHROPIC_BASE_URL, 'https://claude.example.com');
    assert.equal(parsed.env.ANTHROPIC_AUTH_TOKEN, 'claude-secret-5678');
    assert.equal(parsed.env.ANTHROPIC_MODEL, 'claude-fallback');
    assert.equal(parsed.env.ANTHROPIC_DEFAULT_SONNET_MODEL, 'claude-sonnet');
    assert.equal(parsed.env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME, 'Sonnet');
    assert.equal(parsed.env.CLAUDE_CODE_SUBAGENT_MODEL, 'claude-subagent');
  } finally {
    await removeTemporaryHome(home);
  }
});

test('does not create an Official Default file and clears a stale backup when none exists', async () => {
  const home = await createTemporaryHome();
  const configurationDirectory = path.join(home, '.claude');
  const configurationPath = path.join(configurationDirectory, 'settings.json');
  await mkdir(configurationDirectory, { recursive: true });
  await writeFile(`${configurationPath}.foundry-backup`, 'stale backup');
  const { recorder } = createRecorder();
  const applier = new RuntimeConfigurationApplier(createPreviewer(home, []), recorder);

  try {
    await applier.apply({
      runtime: 'claude-code',
      target: { kind: 'official-default' },
    });
    await assert.rejects(readFile(configurationPath), { code: 'ENOENT' });
    await assert.rejects(readFile(`${configurationPath}.foundry-backup`), { code: 'ENOENT' });
  } finally {
    await removeTemporaryHome(home);
  }
});

test('restores an existing file and removes a newly created file when SQLite recording fails', async () => {
  const home = await createTemporaryHome();
  const codexDirectory = path.join(home, '.codex');
  const codexPath = path.join(codexDirectory, 'config.toml');
  const original = 'model = "before"\nunowned = "keep"\n';
  await mkdir(codexDirectory, { recursive: true });
  await writeFile(codexPath, original);
  const { recorder } = createRecorder({ fail: true });
  const previewer = createPreviewer(home, [createCodexProvider(), createClaudeProvider()]);
  const applier = new RuntimeConfigurationApplier(previewer, recorder);

  try {
    await assert.rejects(
      applier.apply({
        runtime: 'codex',
        target: { kind: 'provider', providerId: codexProviderId },
      }),
      (error: unknown) => (
        error instanceof RuntimeOperationError && error.code === 'storage-unavailable'
      ),
    );
    assert.equal(await readFile(codexPath, 'utf8'), original);

    const claudePath = path.join(home, '.claude', 'settings.json');
    await assert.rejects(
      applier.apply({
        runtime: 'claude-code',
        target: { kind: 'provider', providerId: claudeProviderId },
      }),
      (error: unknown) => (
        error instanceof RuntimeOperationError && error.code === 'storage-unavailable'
      ),
    );
    await assert.rejects(readFile(claudePath), { code: 'ENOENT' });
  } finally {
    await removeTemporaryHome(home);
  }
});

test('reports incomplete recovery without exposing file content', async () => {
  const home = await createTemporaryHome();
  const configurationDirectory = path.join(home, '.codex');
  const configurationPath = path.join(configurationDirectory, 'config.toml');
  await mkdir(configurationDirectory, { recursive: true });
  await writeFile(configurationPath, 'model = "disk-secret"\n');
  const { recorder } = createRecorder({ fail: true });
  const fileOperations: RuntimeConfigurationFileOperations = {
    ensureDirectory: async (directory) => {
      await mkdir(directory, { recursive: true, mode: 0o700 });
    },
    writeNewFile: async (filename, content) => {
      await writeFile(filename, content, { flag: 'wx', mode: 0o600 });
      await chmod(filename, 0o600);
    },
    replaceFile: async (source, destination) => rename(source, destination),
    copySecureFile: () => Promise.reject(new Error('recovery failed with disk-secret')),
    removeFile: removeFileIfExists,
  };
  const applier = new RuntimeConfigurationApplier(
    createPreviewer(home, [createCodexProvider()]),
    recorder,
    fileOperations,
  );

  try {
    await assert.rejects(
      applier.apply({
        runtime: 'codex',
        target: { kind: 'provider', providerId: codexProviderId },
      }),
      (error: unknown) => (
        error instanceof RuntimeOperationError
        && error.code === 'configuration-unavailable'
        && error.message.includes('could not be restored')
        && !error.message.includes('disk-secret')
        && !error.message.includes(home)
      ),
    );
  } finally {
    await removeTemporaryHome(home);
  }
});

test('rejects concurrent Apply for one Runtime without globally blocking the other Runtime', async () => {
  const home = await createTemporaryHome();
  const { promise: codexGate, resolve: releaseCodex } = Promise.withResolvers<undefined>();
  const planner = {
    createPlan: async (inputValue: unknown) => {
      const input = inputValue as RuntimeConfigurationPreviewInput;
      if (input.runtime === 'codex') {
        await codexGate;
      }
      return {
        runtime: input.runtime,
        configurationProviderKey: input.runtime === 'codex' ? 'foundry_managed' : null,
        target: { kind: 'official-default' as const },
        file: {
          absolutePath: path.join(
            home,
            input.runtime === 'codex' ? '.codex/config.toml' : '.claude/settings.json',
          ),
          path: input.runtime === 'codex'
            ? '~/.codex/config.toml' as const
            : '~/.claude/settings.json' as const,
          exists: false,
        },
        source: { content: null, values: {} },
        fields: [],
      };
    },
  };
  const { recorder } = createRecorder();
  const applier = new RuntimeConfigurationApplier(planner, recorder);

  try {
    const firstCodex = applier.apply({
      runtime: 'codex',
      target: { kind: 'official-default' },
    });
    await Promise.resolve();
    await assert.rejects(
      applier.apply({ runtime: 'codex', target: { kind: 'official-default' } }),
      (error: unknown) => error instanceof RuntimeOperationError && error.code === 'conflict',
    );
    const claude = await applier.apply({
      runtime: 'claude-code',
      target: { kind: 'official-default' },
    });
    assert.equal(claude.runtime, 'claude-code');
    releaseCodex(undefined);
    const codex = await firstCodex;
    assert.equal(codex.runtime, 'codex');
  } finally {
    releaseCodex(undefined);
    await removeTemporaryHome(home);
  }
});
