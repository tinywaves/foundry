import type { CreatePromptRequest } from '@dhzh/foundry-api-contract';
import { eq } from 'drizzle-orm';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';

import { openFoundryDatabase } from '../src/server/database';
import { prompts } from '../src/server/database/schema';
import { DrizzlePromptStore } from '../src/server/prompts/store';

const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');
const temporaryRoots: string[] = [];

async function createDatabasePath(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'foundry-prompt-store-'));
  temporaryRoots.push(root);
  return path.join(root, 'foundry.sqlite');
}

function createPrompt(
  title: string,
  overrides: Partial<CreatePromptRequest> = {},
): CreatePromptRequest {
  return {
    content: `# ${title}\n\nKeep **this source** exactly.`,
    description: null,
    title,
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })));
});

it('persists exact Markdown and allows duplicate titles', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const times = [100, 200];
  const ids = ['first', 'second'];
  const store = new DrizzlePromptStore(
    database.db,
    () => times.shift() ?? 0,
    () => ids.shift() ?? 'missing',
  );
  const content = '# Exact\n\n$1 {{name}}  \n';

  try {
    const first = store.createPrompt(createPrompt('Duplicate', {
      content,
      description: '  Useful fragment  ',
    }));
    const second = store.createPrompt(createPrompt('Duplicate'));

    expect(first).toMatchObject({
      content,
      description: 'Useful fragment',
    });
    expect(store.getPrompt(first.id)?.content).toBe(content);
    expect(store.listPrompts({
      query: '',
    }).items.map((prompt) => prompt.id)).toEqual([second.id, first.id]);
  } finally {
    database.client.close();
  }
});

it('searches title, description, and content', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  let sequence = 0;
  const store = new DrizzlePromptStore(
    database.db,
    () => ++sequence,
    () => `prompt-${sequence}`,
  );

  try {
    store.createPrompt(createPrompt('Zulu', {
      content: 'Explain the release checklist.',
    }));
    store.createPrompt(createPrompt('Alpha', {
      description: 'Reviews a pull request',
    }));

    expect(store.listPrompts({
      query: 'PULL REQUEST',
    }).items.map((prompt) => prompt.title)).toEqual(['Alpha']);
    expect(store.listPrompts({
      query: 'RELEASE CHECKLIST',
    }).items.map((prompt) => prompt.title)).toEqual(['Zulu']);
  } finally {
    database.client.close();
  }
});

it('soft-deletes an existing Prompt while retaining its row', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const store = new DrizzlePromptStore(database.db, () => 100, () => 'prompt');

  try {
    store.createPrompt(createPrompt('Delete me'));

    expect(store.deletePrompt('prompt')).toBe(true);
    expect(store.getPrompt('prompt')).toBeNull();
    expect(store.deletePrompt('prompt')).toBe(false);
    expect(store.listAllPrompts()).toEqual([]);
    expect(store.updatePrompt('prompt', createPrompt('Updated'))).toBeNull();
    expect(database.db.select({
      deletedAt: prompts.deletedAt,
      title: prompts.title,
    }).from(prompts).where(eq(prompts.id, 'prompt')).get()).toEqual({
      deletedAt: 100,
      title: 'Delete me',
    });
  } finally {
    database.client.close();
  }
});

it('validates content bytes', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  const store = new DrizzlePromptStore(database.db, () => 100, () => 'prompt');

  try {
    expect(() => store.createPrompt(createPrompt('Too large', {
      content: '你'.repeat(350_000),
    }))).toThrow('1 MiB');
    expect(store.listAllPrompts()).toEqual([]);
  } finally {
    database.client.close();
  }
});

it('creates imported Prompts atomically', async () => {
  const database = await openFoundryDatabase({
    databasePath: await createDatabasePath(),
    migrationsFolder,
  });
  let sequence = 0;
  const store = new DrizzlePromptStore(
    database.db,
    () => 100,
    () => `prompt-${++sequence}`,
  );

  try {
    expect(() => store.createPrompts([
      createPrompt('Rolled back'),
      createPrompt('Invalid', { content: '' }),
    ])).toThrow();
    expect(store.listAllPrompts()).toEqual([]);

    expect(store.createPrompts([
      createPrompt('First'),
      createPrompt('Second'),
    ])).toHaveLength(2);
    expect(store.listAllPrompts()).toHaveLength(2);
  } finally {
    database.client.close();
  }
});
