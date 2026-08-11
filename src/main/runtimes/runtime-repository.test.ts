import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { CreateProviderInput } from '../../shared/provider-contract';
import { ProviderRepository } from '../providers/provider-repository';
import { openFoundryDatabase } from '../storage/foundry-database';
import type { RuntimeApiErrorCode } from '../../shared/runtime-contract';
import { RuntimeOperationError } from './runtime-error';
import { RuntimeRepository } from './runtime-repository';

function createCodexInput(
  overrides: Partial<Extract<CreateProviderInput, { runtime: 'codex' }>> = {},
) {
  return {
    runtime: 'codex' as const,
    name: 'Codex Provider',
    baseUrl: 'https://codex.example.com/v1',
    apiKey: 'codex-secret',
    remark: null,
    officialWebsite: null,
    modelConfig: { version: 1 as const, defaultModel: 'gpt-default' },
    ...overrides,
  };
}

function createClaudeInput() {
  return {
    runtime: 'claude-code' as const,
    name: 'Claude Provider',
    baseUrl: 'https://claude.example.com',
    apiKey: null,
    remark: null,
    officialWebsite: null,
    modelConfig: {
      version: 1 as const,
      sonnet: { displayName: 'Sonnet', requestModel: 'claude-sonnet' },
      opus: { displayName: 'Opus', requestModel: 'claude-opus' },
      fable: { displayName: 'Fable', requestModel: 'claude-fable' },
      haiku: { displayName: 'Haiku', requestModel: 'claude-haiku' },
      subagent: { requestModel: 'claude-haiku' },
      defaultFallbackModel: 'claude-sonnet',
    },
  };
}

function assertRuntimeError(
  operation: () => unknown,
  code: RuntimeApiErrorCode,
): RuntimeOperationError {
  let caught: RuntimeOperationError | undefined;
  assert.throws(operation, (error: unknown) => {
    if (!(error instanceof RuntimeOperationError)) {
      return false;
    }
    caught = error;
    return error.code === code;
  });
  assert.ok(caught);
  return caught;
}

test('synthesizes fixed unmanaged Runtimes when no application state exists', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    const repository = new RuntimeRepository(database);
    assert.deepEqual(repository.listRuntimes(), [
      {
        runtime: 'codex',
        status: 'not-managed',
        providerId: null,
        appliedAt: null,
      },
      {
        runtime: 'claude-code',
        status: 'not-managed',
        providerId: null,
        appliedAt: null,
      },
    ]);
  } finally {
    database.close();
  }
});

test('records Provider and Official Default applications and projects In-use ownership', () => {
  const database = openFoundryDatabase(':memory:');
  const providers = new ProviderRepository(database);
  const runtimes = new RuntimeRepository(database);
  try {
    const first = providers.createProvider(createCodexInput({ name: 'First' }));
    const second = providers.createProvider(createCodexInput({ name: 'Second' }));
    const startedAt = Date.now();

    const firstApplication = runtimes.recordProviderApplication('codex', first.id);
    assert.equal(firstApplication.status, 'provider');
    assert.equal(firstApplication.providerId, first.id);
    assert.ok(firstApplication.appliedAt >= startedAt);
    assert.equal(providers.getProviderForEdit(first.id).isInUse, true);
    assert.equal(providers.getProviderForEdit(second.id).isInUse, false);

    const secondApplication = runtimes.recordProviderApplication('codex', second.id);
    assert.equal(secondApplication.status, 'provider');
    assert.equal(secondApplication.providerId, second.id);
    assert.equal(providers.getProviderForEdit(first.id).isInUse, false);
    assert.equal(providers.getProviderForEdit(second.id).isInUse, true);

    const officialDefault = runtimes.recordOfficialDefaultApplication('codex');
    assert.equal(officialDefault.status, 'official-default');
    assert.equal(officialDefault.providerId, null);
    assert.equal(providers.getProviderForEdit(second.id).isInUse, false);
    assert.equal(runtimes.listRuntimes()[1]?.status, 'not-managed');
  } finally {
    database.close();
  }
});

test('rejects invalid, missing, deleted, and Runtime-mismatched Provider targets', () => {
  const database = openFoundryDatabase(':memory:');
  const providers = new ProviderRepository(database);
  const runtimes = new RuntimeRepository(database);
  try {
    assertRuntimeError(() => runtimes.recordProviderApplication('codex', 'invalid'), 'invalid-input');
    assertRuntimeError(
      () => runtimes.recordProviderApplication(
        'codex',
        '00000000-0000-4000-8000-000000000000',
      ),
      'not-found',
    );

    const claude = providers.createProvider(createClaudeInput());
    assertRuntimeError(
      () => runtimes.recordProviderApplication('codex', claude.id),
      'invalid-input',
    );

    const deleted = providers.createProvider(createCodexInput());
    providers.deleteProvider(deleted.id);
    assertRuntimeError(
      () => runtimes.recordProviderApplication('codex', deleted.id),
      'not-found',
    );
  } finally {
    database.close();
  }
});

test('rejects a stored Runtime association whose Provider is no longer active', () => {
  const database = openFoundryDatabase(':memory:');
  const providers = new ProviderRepository(database);
  const runtimes = new RuntimeRepository(database);
  try {
    const provider = providers.createProvider(createCodexInput());
    runtimes.recordProviderApplication('codex', provider.id);
    database.prepare('UPDATE providers SET deleted_at = ? WHERE id = ?').run(Date.now(), provider.id);

    const error = assertRuntimeError(() => runtimes.listRuntimes(), 'storage-corrupt');
    assert.equal(error.message.includes('codex-secret'), false);
  } finally {
    database.close();
  }
});
