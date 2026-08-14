import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'vitest';
import type {
  CreatePromptInput,
  PromptApiErrorCode,
} from '../../shared/prompt-contract';
import {
  PROMPT_CONTENT_MAX_UTF8_BYTES,
  PROMPT_DESCRIPTION_MAX_CODE_POINTS,
  PROMPT_TITLE_MAX_CODE_POINTS,
} from '../../shared/prompt-contract';
import { openFoundryDatabase } from '../storage/foundry-database';
import { PromptOperationError } from './prompt-error';
import { PromptRepository } from './prompt-repository';

function createPromptInput(overrides: Partial<CreatePromptInput> = {}): CreatePromptInput {
  return {
    title: 'Review Prompt',
    description: 'Review source code carefully.',
    content: 'Find correctness and security issues.',
    ...overrides,
  };
}

function openTestRepository() {
  const database = openFoundryDatabase(':memory:');
  return {
    database,
    repository: new PromptRepository(database),
  };
}

function assertPromptError(
  operation: () => unknown,
  code: PromptApiErrorCode,
  field?: string,
): PromptOperationError {
  let caught: PromptOperationError | undefined;
  assert.throws(operation, (error: unknown) => {
    if (!(error instanceof PromptOperationError)) {
      return false;
    }
    caught = error;
    return error.code === code && (field === undefined || error.fields?.[0]?.field === field);
  });
  assert.ok(caught);
  return caught;
}

test('creates duplicate-titled Prompts and lists normalized metadata without content', () => {
  const { database, repository } = openTestRepository();
  try {
    const exactContent = '  # Review\r\n\t- Preserve this text  \n';
    const first = repository.createPrompt(createPromptInput({
      title: '  Shared Prompt  ',
      description: '  First description  ',
      content: exactContent,
    }));
    const second = repository.createPrompt(createPromptInput({
      title: 'Shared Prompt',
      description: null,
    }));

    assert.notEqual(first.id, second.id);
    assert.equal(first.title, 'Shared Prompt');
    assert.equal(first.description, 'First description');
    assert.equal(first.content, exactContent);
    assert.equal(first.currentVersion, 1);

    database.prepare('UPDATE prompts SET created_at = 100, updated_at = 100 WHERE id = ?')
      .run(first.id);
    database.prepare('UPDATE prompt_versions SET created_at = 100 WHERE prompt_id = ?')
      .run(first.id);
    database.prepare('UPDATE prompts SET created_at = 200, updated_at = 200 WHERE id = ?')
      .run(second.id);
    database.prepare('UPDATE prompt_versions SET created_at = 200 WHERE prompt_id = ?')
      .run(second.id);

    const summaries = repository.listPrompts();
    assert.deepEqual(summaries.map((prompt) => prompt.id), [second.id, first.id]);
    assert.equal(Object.hasOwn(summaries[0] ?? {}, 'content'), false);
    assert.deepEqual(repository.getPrompt(first.id), {
      ...first,
      createdAt: 100,
      updatedAt: 100,
    });
  } finally {
    database.close();
  }
});

test('validates Prompt identity, metadata, and UTF-8 content bounds', () => {
  const { database, repository } = openTestRepository();
  try {
    const maxTitle = '界'.repeat(PROMPT_TITLE_MAX_CODE_POINTS);
    const maxDescription = 'd'.repeat(PROMPT_DESCRIPTION_MAX_CODE_POINTS);
    const maxContent = 'p'.repeat(PROMPT_CONTENT_MAX_UTF8_BYTES);
    const boundary = repository.createPrompt(createPromptInput({
      title: maxTitle,
      description: maxDescription,
      content: maxContent,
    }));
    assert.equal(boundary.title, maxTitle);
    assert.equal(Buffer.byteLength(boundary.content, 'utf8'), PROMPT_CONTENT_MAX_UTF8_BYTES);

    assertPromptError(
      () => repository.createPrompt(createPromptInput({
        title: 'x'.repeat(PROMPT_TITLE_MAX_CODE_POINTS + 1),
      })),
      'invalid-input',
      'title',
    );
    assertPromptError(
      () => repository.createPrompt(createPromptInput({ title: 'Line\nBreak' })),
      'invalid-input',
      'title',
    );
    assertPromptError(
      () => repository.createPrompt(createPromptInput({
        description: 'x'.repeat(PROMPT_DESCRIPTION_MAX_CODE_POINTS + 1),
      })),
      'invalid-input',
      'description',
    );
    assertPromptError(
      () => repository.createPrompt(createPromptInput({ content: ' \n\t ' })),
      'invalid-input',
      'content',
    );
    assertPromptError(
      () => repository.createPrompt(createPromptInput({
        content: 'x'.repeat(PROMPT_CONTENT_MAX_UTF8_BYTES + 1),
      })),
      'invalid-input',
      'content',
    );
    assertPromptError(() => repository.getPrompt('not-a-uuid'), 'invalid-input', 'id');
    assertPromptError(
      () => repository.getPromptVersion({ id: boundary.id, version: 0 }),
      'invalid-input',
      'version',
    );
  } finally {
    database.close();
  }
});

test('appends only material edits and exposes immutable newest-first versions', () => {
  const { database, repository } = openTestRepository();
  try {
    const created = repository.createPrompt(createPromptInput());
    const noOp = repository.updatePrompt({
      id: created.id,
      ...createPromptInput({
        title: '  Review Prompt  ',
        description: '  Review source code carefully.  ',
      }),
    });
    assert.deepEqual(noOp, created);

    const updated = repository.updatePrompt({
      id: created.id,
      ...createPromptInput({
        title: 'Updated Review Prompt',
        description: 'Updated description',
        content: '  Updated content\n',
      }),
    });
    assert.equal(updated.currentVersion, 2);
    assert.ok(updated.updatedAt > created.updatedAt);
    assert.deepEqual(
      repository.listPromptVersions(created.id).map((version) => version.version),
      [2, 1],
    );
    assert.deepEqual(repository.getPromptVersion({ id: created.id, version: 1 }), {
      promptId: created.id,
      version: 1,
      createdAt: created.createdAt,
      title: created.title,
      description: created.description,
      content: created.content,
    });
    assert.equal(repository.getPromptVersion({ id: created.id, version: 2 }).content, '  Updated content\n');
  } finally {
    database.close();
  }
});

test('restores a historical snapshot as a new latest version without conflict tracking', () => {
  const { database, repository } = openTestRepository();
  try {
    const created = repository.createPrompt(createPromptInput({ content: 'Version one' }));
    const second = repository.updatePrompt({
      id: created.id,
      ...createPromptInput({ title: 'Second title', content: 'Version two' }),
    });
    const restored = repository.restorePromptVersion({ id: created.id, version: 1 });

    assert.equal(restored.currentVersion, 3);
    assert.equal(restored.title, created.title);
    assert.equal(restored.content, 'Version one');
    assert.ok(restored.updatedAt > second.updatedAt);
    assert.deepEqual(repository.listPromptVersions(created.id).map((version) => version.version), [3, 2, 1]);
    assert.equal(repository.getPromptVersion({ id: created.id, version: 2 }).content, 'Version two');
    assertPromptError(
      () => repository.restorePromptVersion({ id: created.id, version: 3 }),
      'invalid-input',
      'version',
    );
  } finally {
    database.close();
  }
});

test('moves Prompts through Trash without changing content versions or update time', () => {
  const { database, repository } = openTestRepository();
  try {
    const created = repository.createPrompt(createPromptInput());
    const updated = repository.updatePrompt({
      id: created.id,
      ...createPromptInput({ content: 'Current deleted content' }),
    });
    repository.movePromptToTrash(created.id);

    assert.deepEqual(repository.listPrompts(), []);
    assertPromptError(() => repository.getPrompt(created.id), 'not-found');
    assertPromptError(() => repository.listPromptVersions(created.id), 'not-found');
    assert.deepEqual(repository.listTrashedPrompts(), [
      {
        id: created.id,
        title: updated.title,
        trashedAt: repository.getTrashedPrompt(created.id).trashedAt,
      },
    ]);
    const trashed = repository.getTrashedPrompt(created.id);
    assert.equal(trashed.content, 'Current deleted content');
    assert.equal(trashed.currentVersion, 2);

    const restored = repository.restoreTrashedPrompt(created.id);
    assert.equal(restored.updatedAt, updated.updatedAt);
    assert.equal(restored.currentVersion, 2);
    assert.deepEqual(repository.listPromptVersions(created.id).map((version) => version.version), [2, 1]);
  } finally {
    database.close();
  }
});

test('retains removed Prompt data while excluding it from every product operation', () => {
  const { database, repository } = openTestRepository();
  try {
    const created = repository.createPrompt(createPromptInput({ content: 'Retained content' }));
    repository.updatePrompt({
      id: created.id,
      ...createPromptInput({ content: 'Retained second version' }),
    });
    repository.movePromptToTrash(created.id);
    repository.removePromptFromTrash(created.id);

    assert.deepEqual(repository.listPrompts(), []);
    assert.deepEqual(repository.listTrashedPrompts(), []);
    assertPromptError(() => repository.getPrompt(created.id), 'not-found');
    assertPromptError(() => repository.getTrashedPrompt(created.id), 'not-found');
    assertPromptError(() => repository.listPromptVersions(created.id), 'not-found');
    assertPromptError(() => repository.getPromptVersion({ id: created.id, version: 1 }), 'not-found');
    assertPromptError(() => repository.restoreTrashedPrompt(created.id), 'not-found');
    assertPromptError(() => repository.removePromptFromTrash(created.id), 'not-found');

    const row = database.prepare<[string], {
      removed_at: number;
      trashed_at: number;
      version_count: number;
    }>(`
      SELECT prompts.removed_at, prompts.trashed_at, COUNT(prompt_versions.version_number) AS version_count
      FROM prompts
      INNER JOIN prompt_versions ON prompt_versions.prompt_id = prompts.id
      WHERE prompts.id = ?
      GROUP BY prompts.id
    `).get(created.id);
    assert.ok(row);
    assert.ok(row.trashed_at >= 0);
    assert.ok(row.removed_at >= 0);
    assert.equal(row.version_count, 2);
    const retainedContent = database.prepare<[string], string>(`
      SELECT content FROM prompt_versions WHERE prompt_id = ? ORDER BY version_number
    `).pluck().all(created.id);
    assert.deepEqual(retainedContent, ['Retained content', 'Retained second version']);
  } finally {
    database.close();
  }
});

test('empties only current Trash rows and succeeds when Trash is already empty', () => {
  const { database, repository } = openTestRepository();
  try {
    const first = repository.createPrompt(createPromptInput({ title: 'First' }));
    const second = repository.createPrompt(createPromptInput({ title: 'Second' }));
    const active = repository.createPrompt(createPromptInput({ title: 'Active' }));
    repository.movePromptToTrash(first.id);
    repository.movePromptToTrash(second.id);

    assert.equal(repository.emptyPromptTrash(), 2);
    assert.equal(repository.emptyPromptTrash(), 0);
    assert.deepEqual(repository.listPrompts().map((prompt) => prompt.id), [active.id]);
    assert.deepEqual(repository.listTrashedPrompts(), []);
    const retainedVersionCount = database.prepare<[], number>(`
      SELECT COUNT(*) FROM prompt_versions
    `).pluck().get();
    assert.equal(retainedVersionCount, 3);
  } finally {
    database.close();
  }
});

test('maps malformed stored Prompt data to non-sensitive corruption errors', () => {
  const { database, repository } = openTestRepository();
  try {
    const secretContent = 'private prompt content';
    const created = repository.createPrompt(createPromptInput({ content: secretContent }));
    database.prepare('UPDATE prompt_versions SET title = ? WHERE prompt_id = ?')
      .run('  unnormalized title  ', created.id);

    const error = assertPromptError(() => repository.getPrompt(created.id), 'storage-corrupt');
    assert.equal(error.message.includes(secretContent), false);
    assert.equal(JSON.stringify(error.toApiError()).includes(secretContent), false);

    const versioned = repository.createPrompt(createPromptInput({ title: 'Versioned' }));
    repository.updatePrompt({
      id: versioned.id,
      ...createPromptInput({ title: 'Versioned again' }),
    });
    database.prepare('DELETE FROM prompt_versions WHERE prompt_id = ? AND version_number = 1')
      .run(versioned.id);
    assertPromptError(() => repository.listPromptVersions(versioned.id), 'storage-corrupt');
  } finally {
    database.close();
  }
});
