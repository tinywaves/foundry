import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { expect, it } from 'vitest';
import { SessionSourceError } from '../src/features/sessions/contracts';
import { SessionService } from '../src/features/sessions/service';
import { createApiApp } from '../src/server/api';
import { openFoundryDatabase } from '../src/storage/database';

const { join } = path;

const ASSIGNED_ID = '11111111-1111-4111-8111-111111111111';
const PROJECTLESS_ID = '22222222-2222-4222-8222-222222222222';
const SUBAGENT_ID = '33333333-3333-4333-8333-333333333333';
const UNKNOWN_PROJECT_ID = '44444444-4444-4444-8444-444444444444';
const SEGMENT_ID = '55555555-5555-4555-8555-555555555555';

it('builds a read-only Codex snapshot with project, size, and thread flags', async () => {
  const codexHome = await mkdtemp(join(tmpdir(), 'foundry-codex-'));
  const databasePath = join(codexHome, 'state_4.sqlite');
  const client = new Database(databasePath);
  client.exec(`
    CREATE TABLE threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      name TEXT,
      first_user_message TEXT,
      preview TEXT,
      cwd TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL,
      updated_at_ms INTEGER,
      created_at INTEGER NOT NULL,
      created_at_ms INTEGER,
      archived INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT '',
      model TEXT,
      model_provider TEXT,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      rollout_path TEXT,
      git_branch TEXT
    );
  `);
  const insert = client.prepare(`
    INSERT INTO threads (
      id, title, name, first_user_message, preview, cwd,
      updated_at, updated_at_ms, created_at, created_at_ms,
      archived, source, model, model_provider, tokens_used,
      rollout_path, git_branch
    ) VALUES (
      @id, @title, @name, @firstUserMessage, @preview, @cwd,
      @updatedAt, @updatedAtMs, @createdAt, @createdAtMs,
      @archived, @source, @model, @modelProvider, @tokensUsed,
      @rolloutPath, @gitBranch
    )
  `);
  insert.run({
    id: ASSIGNED_ID,
    title: 'raw first message',
    name: 'Alpha work',
    firstUserMessage: 'first message',
    preview: 'preview',
    cwd: '/repo/one',
    updatedAt: 1_795_000_000,
    updatedAtMs: 1_795_000_000_000,
    createdAt: 1_794_000_000,
    createdAtMs: 1_794_000_000_000,
    archived: 0,
    source: 'vscode',
    model: 'model-one',
    modelProvider: 'provider-one',
    tokensUsed: 1234,
    rolloutPath: join(
      codexHome,
      'sessions/2026/11/18',
      `rollout-2026-11-18T10-00-00-${ASSIGNED_ID}.jsonl`,
    ),
    gitBranch: 'main',
  });
  insert.run({
    id: PROJECTLESS_ID,
    title: 'projectless',
    name: null,
    firstUserMessage: null,
    preview: null,
    cwd: '',
    updatedAt: 1_793_000_000,
    updatedAtMs: 1_793_000_000_000,
    createdAt: 1_793_000_000,
    createdAtMs: 1_793_000_000_000,
    archived: 1,
    source: 'vscode',
    model: null,
    modelProvider: null,
    tokensUsed: 0,
    rolloutPath: null,
    gitBranch: null,
  });
  insert.run({
    id: SUBAGENT_ID,
    title: 'delegated work',
    name: null,
    firstUserMessage: null,
    preview: null,
    cwd: '/repo/two',
    updatedAt: 1_792_000_000,
    updatedAtMs: 1_792_000_000_000,
    createdAt: 1_792_000_000,
    createdAtMs: 1_792_000_000_000,
    archived: 0,
    source: '{"subagent":{"thread_spawn":{"depth":1}}}',
    model: null,
    modelProvider: 'provider-two',
    tokensUsed: 10,
    rolloutPath: null,
    gitBranch: null,
  });
  insert.run({
    id: UNKNOWN_PROJECT_ID,
    title: 'missing project assignment',
    name: null,
    firstUserMessage: null,
    preview: null,
    cwd: '',
    updatedAt: 1_791_000_000,
    updatedAtMs: 1_791_000_000_000,
    createdAt: 1_791_000_000,
    createdAtMs: 1_791_000_000_000,
    archived: 0,
    source: 'vscode',
    model: null,
    modelProvider: null,
    tokensUsed: 0,
    rolloutPath: null,
    gitBranch: null,
  });
  client.close();

  await mkdir(join(codexHome, 'sessions/2026/11/18'), { recursive: true });
  await mkdir(join(codexHome, 'archived_sessions'), { recursive: true });
  await writeFile(
    join(
      codexHome,
      'sessions/2026/11/18',
      `rollout-2026-11-18T10-00-00-${ASSIGNED_ID}.jsonl`,
    ),
    'a'.repeat(100),
  );
  await writeFile(
    join(
      codexHome,
      'sessions/2026/11/18',
      `rollout-2026-11-18T10-05-00-${ASSIGNED_ID}_${SEGMENT_ID}.jsonl.zst`,
    ),
    'b'.repeat(50),
  );
  await writeFile(
    join(
      codexHome,
      'archived_sessions',
      `rollout-2026-11-18T09-00-00-${PROJECTLESS_ID}.jsonl.zst`,
    ),
    'c'.repeat(25),
  );
  await writeFile(
    join(
      codexHome,
      'sessions/2026/11/18',
      `rollout-2026-11-18T09-30-00-${SUBAGENT_ID}.jsonl`,
    ),
    'd'.repeat(10),
  );
  await writeFile(
    join(codexHome, '.codex-global-state.json'),
    JSON.stringify({
      'local-projects': {
        p1: {
          id: 'p1',
          name: 'Project One',
          rootPaths: ['/repo/one', '/repo/two'],
        },
        p2: {
          id: 'p2',
          name: 'Project Two',
          rootPaths: ['/repo/three'],
        },
      },
      'thread-project-assignments': {
        [ASSIGNED_ID]: { projectKind: 'local', projectId: 'p1' },
        [UNKNOWN_PROJECT_ID]: { projectKind: 'local', projectId: 'missing' },
      },
      'projectless-thread-ids': [PROJECTLESS_ID],
    }),
  );

  try {
    const snapshot = new SessionService(codexHome).getCodexSnapshot();
    expect(snapshot.source).toBe('codex');
    expect(snapshot.projects).toEqual([
      { id: 'p1', name: 'Project One', roots: ['/repo/one', '/repo/two'] },
      { id: 'p2', name: 'Project Two', roots: ['/repo/three'] },
    ]);
    expect(snapshot.warnings).toEqual([]);
    expect(snapshot.threads).toHaveLength(4);

    const assigned = snapshot.threads.find((thread) => thread.id === ASSIGNED_ID);
    expect(assigned).toMatchObject({
      title: 'Alpha work',
      projectId: 'p1',
      projectBucket: 'assigned',
      sizeBytes: 150,
      segmentCount: 2,
      tokensUsed: 1234,
      model: 'model-one',
      gitBranch: 'main',
      archived: false,
      subagent: false,
    });

    expect(snapshot.threads.find((thread) => thread.id === PROJECTLESS_ID))
      .toMatchObject({
        projectId: null,
        projectBucket: 'projectless',
        sizeBytes: 25,
        archived: true,
      });
    expect(snapshot.threads.find((thread) => thread.id === SUBAGENT_ID))
      .toMatchObject({
        projectBucket: 'unassigned',
        subagent: true,
        sizeBytes: 10,
        model: 'provider-two',
      });
    expect(snapshot.threads.find((thread) => thread.id === UNKNOWN_PROJECT_ID))
      .toMatchObject({
        projectId: null,
        projectBucket: 'unassigned',
      });
    expect(snapshot.threads[0].id).toBe(ASSIGNED_ID);
  } finally {
    await rm(codexHome, { recursive: true, force: true });
  }
});

it('reports missing Codex data and unsupported schemas separately', async () => {
  const missingHome = await mkdtemp(join(tmpdir(), 'foundry-codex-missing-'));
  try {
    let error: unknown;
    try {
      new SessionService(join(missingHome, 'missing')).getCodexSnapshot();
    } catch (error_) {
      error = error_;
    }
    expect(error).toBeInstanceOf(SessionSourceError);
    expect(error).toMatchObject({ code: 'CODEX_DATA_NOT_FOUND' });
  } finally {
    await rm(missingHome, { recursive: true, force: true });
  }

  const unsupportedHome = await mkdtemp(join(tmpdir(), 'foundry-codex-schema-'));
  const client = new Database(join(unsupportedHome, 'state_9.sqlite'));
  client.exec('CREATE TABLE other (id TEXT PRIMARY KEY)');
  client.close();

  try {
    let error: unknown;
    try {
      new SessionService(unsupportedHome).getCodexSnapshot();
    } catch (error_) {
      error = error_;
    }
    expect(error).toBeInstanceOf(SessionSourceError);
    expect(error).toMatchObject({ code: 'UNSUPPORTED_CODEX_SCHEMA' });
  } finally {
    await rm(unsupportedHome, { recursive: true, force: true });
  }
});

it('serves the Codex snapshot through the sessions API', async () => {
  const codexHome = await mkdtemp(join(tmpdir(), 'foundry-codex-api-'));
  const databasePath = join(codexHome, 'state_1.sqlite');
  const client = new Database(databasePath);
  client.exec(`
    CREATE TABLE threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL
    );
    INSERT INTO threads (id, title, updated_at)
    VALUES ('11111111-1111-4111-8111-111111111111', 'API thread', 1795000000);
  `);
  client.close();
  const foundryHome = await mkdtemp(join(tmpdir(), 'foundry-sessions-api-'));
  const database = openFoundryDatabase(join(foundryHome, 'foundry.sqlite'));
  const app = createApiApp(database, {
    sessionService: new SessionService(codexHome),
  });

  try {
    const response = await app.request('/api/sessions/codex');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      source: 'codex',
      projects: [],
      threads: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'API thread',
          projectBucket: 'unassigned',
        },
      ],
      warnings: [{ code: 'PROJECTS_UNAVAILABLE' }],
    });
  } finally {
    database.client.close();
    await rm(foundryHome, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
});

it('builds a read-only Claude snapshot from indexed and orphaned transcripts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'foundry-claude-'));
  const claudeHome = join(root, '.claude');
  const projectDirectory = join(claudeHome, 'projects', '-repo-one');
  const orphanDirectory = join(claudeHome, 'projects', '-repo-two');
  const indexedId = '66666666-6666-4666-8666-666666666666';
  const orphanId = '77777777-7777-4777-8777-777777777777';
  const missingId = '88888888-8888-4888-8888-888888888888';
  await mkdir(projectDirectory, { recursive: true });
  await mkdir(orphanDirectory, { recursive: true });

  const indexedPath = join(projectDirectory, `${indexedId}.jsonl`);
  await writeFile(indexedPath, [
    {
      type: 'user',
      timestamp: '2026-05-01T10:00:01.000Z',
      cwd: '/repo/one',
      gitBranch: 'main',
      message: { role: 'user', content: 'Indexed first prompt' },
    },
    {
      type: 'assistant',
      timestamp: '2026-05-01T10:30:00.000Z',
      cwd: '/repo/one',
      gitBranch: 'main',
      message: {
        role: 'assistant',
        model: 'claude-sonnet-4-5',
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          cache_creation_input_tokens: 2,
          cache_read_input_tokens: 3,
        },
      },
    },
  ].map((record) => JSON.stringify(record)).join('\n'));

  const orphanPath = join(orphanDirectory, `${orphanId}.jsonl`);
  await writeFile(orphanPath, [
    { type: 'custom-title', customTitle: 'Orphan custom title' },
    {
      type: 'user',
      timestamp: '2026-05-02T09:00:00.000Z',
      cwd: '/repo/two',
      isSidechain: true,
      message: { role: 'user', content: 'Orphan first prompt' },
    },
    {
      type: 'assistant',
      timestamp: '2026-05-02T09:05:00.000Z',
      cwd: '/repo/two',
      gitBranch: 'feature/claude',
      message: {
        role: 'assistant',
        model: 'claude-opus-4-5',
        usage: { input_tokens: 4, output_tokens: 3 },
      },
    },
  ].map((record) => JSON.stringify(record)).join('\n'));

  await writeFile(
    join(projectDirectory, 'sessions-index.json'),
    JSON.stringify({
      version: 1,
      originalPath: '/repo/one',
      entries: [
        {
          sessionId: indexedId,
          fullPath: indexedPath,
          firstPrompt: 'Indexed first prompt',
          summary: 'Indexed summary',
          created: '2026-05-01T10:00:00.000Z',
          modified: '2026-05-01T10:30:00.000Z',
          gitBranch: 'main',
          projectPath: '/repo/one',
          isSidechain: false,
        },
        {
          sessionId: missingId,
          fullPath: join(projectDirectory, `${missingId}.jsonl`),
          summary: 'Missing transcript',
          projectPath: '/repo/one',
          isSidechain: false,
        },
      ],
    }),
  );

  try {
    const snapshot = new SessionService(
      join(root, '.codex'),
      claudeHome,
    ).getClaudeSnapshot();

    expect(snapshot.source).toBe('claude');
    expect(snapshot.threads).toHaveLength(2);
    expect(snapshot.warnings).toEqual([]);
    expect(snapshot.projects).toEqual(expect.arrayContaining([
      { id: 'claude:/repo/one', name: 'one', roots: ['/repo/one'] },
      { id: 'claude:/repo/two', name: 'two', roots: ['/repo/two'] },
    ]));

    const indexed = snapshot.threads.find((thread) => thread.id === indexedId);
    expect(indexed).toMatchObject({
      title: 'Indexed summary',
      projectId: 'claude:/repo/one',
      projectBucket: 'assigned',
      archived: false,
      subagent: false,
      tokensUsed: 20,
      model: 'claude-sonnet-4-5',
      cwd: '/repo/one',
      gitBranch: 'main',
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:30:00.000Z',
    });
    expect(indexed?.sizeBytes).toBeGreaterThan(0);

    const orphan = snapshot.threads.find((thread) => thread.id === orphanId);
    expect(orphan).toMatchObject({
      title: 'Orphan custom title',
      projectId: 'claude:/repo/two',
      subagent: true,
      tokensUsed: 7,
      model: 'claude-opus-4-5',
      cwd: '/repo/two',
      gitBranch: 'feature/claude',
    });
    expect(snapshot.threads.map((thread) => thread.id))
      .toEqual([orphanId, indexedId]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('reports missing Claude data', async () => {
  const root = await mkdtemp(join(tmpdir(), 'foundry-claude-missing-'));
  try {
    let error: unknown;
    try {
      new SessionService(
        join(root, '.codex'),
        join(root, '.claude'),
      ).getClaudeSnapshot();
    } catch (error_) {
      error = error_;
    }
    expect(error).toMatchObject({ code: 'CLAUDE_DATA_NOT_FOUND' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('serves the Claude snapshot through the sessions API', async () => {
  const root = await mkdtemp(join(tmpdir(), 'foundry-claude-api-'));
  const claudeHome = join(root, '.claude');
  const projectDirectory = join(claudeHome, 'projects', '-repo-api');
  const sessionId = '99999999-9999-4999-8999-999999999999';
  await mkdir(projectDirectory, { recursive: true });
  await writeFile(
    join(projectDirectory, `${sessionId}.jsonl`),
    JSON.stringify({
      type: 'user',
      timestamp: '2026-05-03T09:00:00.000Z',
      cwd: '/repo/api',
      message: { role: 'user', content: 'Claude API thread' },
    }),
  );

  const foundryHome = await mkdtemp(join(tmpdir(), 'foundry-sessions-api-'));
  const database = openFoundryDatabase(join(foundryHome, 'foundry.sqlite'));
  const app = createApiApp(database, {
    sessionService: new SessionService(
      join(root, '.codex'),
      claudeHome,
    ),
  });

  try {
    const response = await app.request('/api/sessions/claude');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      source: 'claude',
      threads: [
        {
          id: sessionId,
          title: 'Claude API thread',
          projectId: 'claude:/repo/api',
        },
      ],
      warnings: [],
    });
  } finally {
    database.client.close();
    await rm(foundryHome, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});
