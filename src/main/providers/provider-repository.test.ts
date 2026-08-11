import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'vitest';
import type {
  ClaudeCodeModelConfigV1,
  CreateProviderInput,
  ProviderApiErrorCode,
  ProviderAvatar,
} from '../../shared/provider-contract';
import { RuntimeRepository } from '../runtimes/runtime-repository';
import { openFoundryDatabase } from '../storage/foundry-database';
import { ProviderOperationError } from './provider-error';
import { ProviderRepository } from './provider-repository';

const pngAvatar: ProviderAvatar = {
  mimeType: 'image/png',
  bytes: Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
};

const jpegAvatar: ProviderAvatar = {
  mimeType: 'image/jpeg',
  bytes: Uint8Array.from([0xFF, 0xD8, 0xFF]),
};

function createClaudeModelConfig(): ClaudeCodeModelConfigV1 {
  return {
    version: 1,
    sonnet: { displayName: 'Sonnet', requestModel: 'claude-sonnet' },
    opus: { displayName: 'Opus', requestModel: 'claude-opus' },
    fable: { displayName: 'Fable', requestModel: 'claude-fable' },
    haiku: { displayName: 'Haiku', requestModel: 'claude-haiku' },
    subagent: { requestModel: 'claude-haiku' },
    defaultFallbackModel: 'claude-sonnet',
  };
}

function createCodexInput(overrides: Partial<Extract<CreateProviderInput, { runtime: 'codex' }>> = {}) {
  return {
    runtime: 'codex' as const,
    name: 'Custom Provider',
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'secret-api-key',
    remark: null,
    officialWebsite: null,
    modelConfig: { version: 1 as const, defaultModel: 'gpt-default' },
    ...overrides,
  };
}

function createClaudeInput(
  overrides: Partial<Extract<CreateProviderInput, { runtime: 'claude-code' }>> = {},
) {
  return {
    runtime: 'claude-code' as const,
    name: 'Custom Provider',
    baseUrl: 'https://claude.example.com',
    apiKey: null,
    remark: null,
    officialWebsite: null,
    modelConfig: createClaudeModelConfig(),
    ...overrides,
  };
}

function assertProviderError(
  operation: () => unknown,
  code: ProviderApiErrorCode,
  field?: string,
): ProviderOperationError {
  let caught: ProviderOperationError | undefined;
  assert.throws(operation, (error: unknown) => {
    if (!(error instanceof ProviderOperationError)) {
      return false;
    }
    caught = error;
    return error.code === code && (field === undefined || error.fields?.[0]?.field === field);
  });
  assert.ok(caught);
  return caught;
}

function openTestRepository() {
  const database = openFoundryDatabase(':memory:');
  return {
    database,
    repository: new ProviderRepository(database),
  };
}

test('isolates runtimes, allows duplicate names, and returns sensitive data only from explicit methods', () => {
  const { database, repository } = openTestRepository();
  try {
    const firstCodex = repository.createProvider(createCodexInput({
      name: ' Shared Name ',
      remark: ' ',
      officialWebsite: ' https://example.com/providers?runtime=codex#setup ',
      avatar: pngAvatar,
    }));
    const secondCodex = repository.createProvider(createCodexInput({ name: 'Shared Name' }));
    const claude = repository.createProvider(createClaudeInput({ name: 'Shared Name' }));
    database.prepare('UPDATE providers SET created_at = ? WHERE id = ?').run(100, firstCodex.id);
    database.prepare('UPDATE providers SET created_at = ? WHERE id = ?').run(200, secondCodex.id);
    repository.updateProvider({ ...createCodexInput({ name: 'Shared Name' }), id: firstCodex.id });

    const codexProviders = repository.listProviders('codex');
    const claudeProviders = repository.listProviders('claude-code');
    assert.equal(codexProviders.length, 2);
    assert.equal(claudeProviders.length, 1);
    assert.deepEqual(codexProviders.map((provider) => provider.id), [secondCodex.id, firstCodex.id]);
    assert.equal(claudeProviders[0]?.id, claude.id);
    assert.equal(firstCodex.source, 'user-custom');
    assert.equal(firstCodex.name, 'Shared Name');
    assert.equal(firstCodex.remark, null);
    assert.equal(firstCodex.baseUrl, 'https://api.example.com/v1');
    assert.equal(firstCodex.officialWebsite, 'https://example.com/providers?runtime=codex#setup');
    assert.equal(firstCodex.apiKeySuffix, '-key');
    assert.equal(firstCodex.hasApiKey, true);
    assert.equal(firstCodex.hasCustomAvatar, true);
    assert.equal(Object.hasOwn(firstCodex, 'apiKey'), false);
    assert.equal(Object.hasOwn(firstCodex, 'avatar'), false);

    const detail = repository.getProviderForEdit(firstCodex.id);
    assert.equal(detail.apiKey, 'secret-api-key');
    assert.equal(repository.getProviderApiKey(firstCodex.id), 'secret-api-key');
    assert.deepEqual(detail.modelConfig, { version: 1, defaultModel: 'gpt-default' });
    assert.deepEqual(repository.getProviderForEdit(claude.id).modelConfig, createClaudeModelConfig());
    assert.deepEqual(repository.getProviderAvatar(firstCodex.id), pngAvatar);
  } finally {
    database.close();
  }
});

test('validates URLs, models, API keys, and avatar content at the repository boundary', () => {
  const { database, repository } = openTestRepository();
  try {
    assertProviderError(
      () => repository.createProvider(createCodexInput({ baseUrl: 'https://api.example.com?key=value' })),
      'invalid-input',
      'baseUrl',
    );
    assertProviderError(
      () => repository.createProvider(createCodexInput({ baseUrl: 'https://user@example.com' })),
      'invalid-input',
      'baseUrl',
    );
    assertProviderError(
      () => repository.createProvider(createCodexInput({ modelConfig: { version: 1, defaultModel: ' ' } })),
      'invalid-input',
      'modelConfig.defaultModel',
    );
    assertProviderError(
      () => repository.createProvider({
        ...createCodexInput(),
        avatar: { mimeType: 'image/png', bytes: jpegAvatar.bytes },
      }),
      'invalid-input',
      'avatar.bytes',
    );
    assertProviderError(
      () => repository.createProvider({
        ...createCodexInput(),
        avatar: { mimeType: 'image/png', bytes: new Uint8Array((2 * 1024 * 1024) + 1) },
      }),
      'invalid-input',
      'avatar.bytes',
    );

    const whitespaceKey = repository.createProvider(createCodexInput({ apiKey: '  key with spaces  ' }));
    const emptyKey = repository.createProvider(createCodexInput({ apiKey: '' }));
    const unicodeKey = repository.createProvider(createCodexInput({ apiKey: 'key-1🔑2🔑3🔑4🔑5🔑' }));
    assert.equal(repository.getProviderForEdit(whitespaceKey.id).apiKey, '  key with spaces  ');
    assert.equal(repository.getProviderForEdit(emptyKey.id).apiKey, null);
    assert.equal(unicodeKey.apiKeySuffix, '4🔑5🔑');
    assert.equal(repository.getProviderForEdit(unicodeKey.id).apiKey, 'key-1🔑2🔑3🔑4🔑5🔑');
  } finally {
    database.close();
  }
});

test('preserves, removes, and replaces avatars while preventing runtime changes', () => {
  const { database, repository } = openTestRepository();
  try {
    const created = repository.createProvider(createCodexInput({ avatar: pngAvatar }));
    repository.updateProvider({
      ...createCodexInput({ name: 'Updated', avatar: undefined }),
      id: created.id,
    });
    assert.deepEqual(repository.getProviderAvatar(created.id), pngAvatar);

    repository.updateProvider({ ...createCodexInput({ avatar: null }), id: created.id });
    assert.equal(repository.getProviderAvatar(created.id), null);

    repository.updateProvider({ ...createCodexInput({ avatar: jpegAvatar }), id: created.id });
    assert.deepEqual(repository.getProviderAvatar(created.id), jpegAvatar);

    assertProviderError(
      () => repository.updateProvider({ ...createClaudeInput(), id: created.id }),
      'invalid-input',
      'runtime',
    );
  } finally {
    database.close();
  }
});

test('persists connection summaries, preserves them for metadata edits, and rejects stale writes', () => {
  const { database, repository } = openTestRepository();
  try {
    const created = repository.createProvider(createCodexInput());
    const initialTarget = repository.getProviderConnectionTarget(created.id);
    const connected = repository.recordProviderConnectionSummary(initialTarget, {
      status: 'connected',
      lastTestedAt: 1000,
      lastError: null,
    });
    assert.deepEqual(connected.connection, {
      status: 'connected',
      lastTestedAt: 1000,
      lastError: null,
    });

    const metadataUpdate = repository.updateProvider({
      ...createCodexInput({
        name: 'Renamed Provider',
        remark: 'Metadata only',
        officialWebsite: 'https://example.com/provider',
      }),
      id: created.id,
    });
    assert.equal(metadataUpdate.connection.status, 'connected');
    assert.equal(metadataUpdate.connection.lastTestedAt, 1000);

    const staleTarget = repository.getProviderConnectionTarget(created.id);
    const connectionUpdate = repository.updateProvider({
      ...createCodexInput({ baseUrl: 'https://new-api.example.com/v1' }),
      id: created.id,
    });
    assert.deepEqual(connectionUpdate.connection, {
      status: 'never-tested',
      lastTestedAt: null,
      lastError: null,
    });
    assertProviderError(
      () => repository.recordProviderConnectionSummary(staleTarget, {
        status: 'failed',
        lastTestedAt: 2000,
        lastError: 'HTTP 401 Unauthorized',
      }),
      'conflict',
    );

    const currentTarget = repository.getProviderConnectionTarget(created.id);
    const failed = repository.recordProviderConnectionSummary(currentTarget, {
      status: 'failed',
      lastTestedAt: 3000,
      lastError: 'HTTP 401 Unauthorized',
    });
    assert.deepEqual(failed.connection, {
      status: 'failed',
      lastTestedAt: 3000,
      lastError: 'HTTP 401 Unauthorized',
    });

    const modelUpdate = repository.updateProvider({
      ...createCodexInput({
        baseUrl: 'https://new-api.example.com/v1',
        modelConfig: { version: 1, defaultModel: 'gpt-new' },
      }),
      id: created.id,
    });
    assert.equal(modelUpdate.connection.status, 'never-tested');

    const modelTarget = repository.getProviderConnectionTarget(created.id);
    repository.recordProviderConnectionSummary(modelTarget, {
      status: 'connected',
      lastTestedAt: 4000,
      lastError: null,
    });
    const keyUpdate = repository.updateProvider({
      ...createCodexInput({
        baseUrl: 'https://new-api.example.com/v1',
        apiKey: 'new-secret-key',
        modelConfig: { version: 1, defaultModel: 'gpt-new' },
      }),
      id: created.id,
    });
    assert.equal(keyUpdate.connection.status, 'never-tested');
  } finally {
    database.close();
  }
});

test('soft delete retains the complete row and excludes it from every normal operation', () => {
  const { database, repository } = openTestRepository();
  try {
    const created = repository.createProvider(createCodexInput({
      avatar: pngAvatar,
      remark: 'Keep this',
      officialWebsite: 'https://example.com/provider',
    }));
    repository.deleteProvider(created.id);

    assert.deepEqual(repository.listProviders('codex'), []);
    assertProviderError(() => repository.getProviderForEdit(created.id), 'not-found');
    assertProviderError(() => repository.getProviderAvatar(created.id), 'not-found');
    assertProviderError(() => repository.getProviderApiKey(created.id), 'not-found');
    assertProviderError(() => repository.getProviderConnectionTarget(created.id), 'not-found');
    assertProviderError(
      () => repository.updateProvider({ ...createCodexInput(), id: created.id }),
      'not-found',
    );
    assertProviderError(() => repository.deleteProvider(created.id), 'not-found');

    const row = database.prepare<[string], {
      api_key: string;
      avatar_data: Buffer;
      deleted_at: number;
      model_config_json: string;
      remark: string;
    }>(`
      SELECT api_key, avatar_data, deleted_at, model_config_json, remark
      FROM providers
      WHERE id = ?
    `).get(created.id);
    assert.ok(row);
    assert.equal(row.api_key, 'secret-api-key');
    assert.deepEqual(row.avatar_data, Buffer.from(pngAvatar.bytes));
    assert.equal(row.remark, 'Keep this');
    assert.ok(row.deleted_at > 0);
    assert.deepEqual(JSON.parse(row.model_config_json), { version: 1, defaultModel: 'gpt-default' });
  } finally {
    database.close();
  }
});

test('prevents deleting an In-use Provider until its Runtime association changes', () => {
  const { database, repository } = openTestRepository();
  const runtimes = new RuntimeRepository(database);
  try {
    const created = repository.createProvider(createCodexInput());
    assert.equal(created.isInUse, false);

    runtimes.recordProviderApplication('codex', created.id);
    assert.equal(repository.getProviderForEdit(created.id).isInUse, true);
    assertProviderError(() => repository.deleteProvider(created.id), 'conflict');

    const preserved = database.prepare<[string], { deleted_at: number | null }>(`
      SELECT deleted_at FROM providers WHERE id = ?
    `).get(created.id);
    assert.ok(preserved);
    assert.equal(preserved.deleted_at, null);
    assert.equal(runtimes.listRuntimes()[0]?.status, 'provider');

    runtimes.recordOfficialDefaultApplication('codex');
    assert.equal(repository.getProviderForEdit(created.id).isInUse, false);
    repository.deleteProvider(created.id);
    assertProviderError(() => repository.getProviderForEdit(created.id), 'not-found');
  } finally {
    database.close();
  }
});

test('maps invalid stored model data to non-sensitive corruption errors', () => {
  const { database, repository } = openTestRepository();
  try {
    const created = repository.createProvider(createCodexInput());
    database.pragma('ignore_check_constraints = ON');
    database.prepare('UPDATE providers SET model_config_json = ? WHERE id = ?')
      .run('{"version":1,"defaultModel":""}', created.id);
    const error = assertProviderError(() => repository.listProviders('codex'), 'storage-corrupt');
    assert.equal(error.message.includes('secret-api-key'), false);

    database.prepare('UPDATE providers SET model_config_json = ?, avatar_mime_type = ?, avatar_data = ? WHERE id = ?')
      .run(
        '{"version":1,"defaultModel":"gpt-default"}',
        'image/png',
        Buffer.from(jpegAvatar.bytes),
        created.id,
      );
    assertProviderError(() => repository.getProviderAvatar(created.id), 'storage-corrupt');

    database.prepare('UPDATE providers SET avatar_mime_type = NULL, avatar_data = NULL, api_key = ? WHERE id = ?')
      .run(Buffer.from('not text'), created.id);
    assertProviderError(() => repository.getProviderForEdit(created.id), 'storage-corrupt');
  } finally {
    database.close();
  }
});
