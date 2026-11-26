import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { Buffer } from 'node:buffer';
import path from 'node:path';
// Node 24 provides Zstandard fixtures without an external executable.
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import { zstdCompressSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { SessionService } from '../src/features/sessions/service';
import { createApiApp } from '../src/server/api';
import { openFoundryStorage } from '../src/storage/index';

const ID = '11111111-1111-4111-8111-111111111111';
const CHILD_ID = '22222222-2222-4222-8222-222222222222';
const ARCHIVED_ID = '33333333-3333-4333-8333-333333333333';
const START = '2026-11-26T03:00:00.000Z';
const END = '2026-11-26T04:00:00.000Z';

async function transcript(file: string, records: unknown[], isCompressed = false) {
  await mkdir(path.dirname(file), { recursive: true });
  const content = records.map((record) => JSON.stringify(record)).join('\n');
  const bytes = isCompressed ? zstdCompressSync(content) : content;
  await writeFile(file, bytes);
  return Buffer.byteLength(bytes);
}

function meta(id: string, extra = {}) {
  return { type: 'session_meta', timestamp: START, payload: { id, cwd: '/repo/one', ...extra } };
}

function prompt(value: string, date = START) {
  return {
    type: 'response_item',
    timestamp: date,
    payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: value }] },
  };
}

function codexUsage(tokens: number, date = END) {
  return {
    type: 'token_usage_record',
    timestamp: date,
    payload: { thread_token_usage: { total_tokens: tokens } },
  };
}

it('discovers Codex transcripts without databases and merges compressed continuation segments', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'foundry-codex-'));
  try {
    const first = path.join(home, 'sessions/2026/11/26', `rollout-2026-11-26T03-00-00-${ID}.jsonl`);
    const firstBytes = await transcript(first, [
      meta(ID, { git: { branch: 'main' } }),
      prompt('# AGENTS.md instructions for /repo/one'),
      prompt('<environment_context>metadata</environment_context>'),
      prompt('Actual first prompt'),
      { type: 'turn_context', timestamp: START, payload: { model: 'model-one', cwd: '/repo/one' } },
      codexUsage(100, START),
    ]);
    // A leftover compressed representation must not duplicate a segment.
    await writeFile(`${first}.zst`, zstdCompressSync(await readFile(first)));
    const secondBytes = await transcript(
      path.join(home, 'sessions/2026/11/26', `rollout-2026-11-26T04-00-00-${ID}_${CHILD_ID}.jsonl.zst`),
      [
        prompt('Later prompt', END),
        { type: 'turn_context', timestamp: END, payload: { model: 'model-two', cwd: '/repo/two' } },
        codexUsage(200),
        { type: 'event_msg', timestamp: END, payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 200 } } } },
      ],
      true,
    );
    await transcript(path.join(home, 'archived_sessions', `${ARCHIVED_ID}.jsonl.zst`), [meta(ARCHIVED_ID), prompt('Archived work')], true);
    await transcript(path.join(home, 'sessions', `${CHILD_ID}.jsonl`), [
      meta(CHILD_ID, { source: { subagent: { parent_thread_id: ID } }, model_provider: 'fallback-provider' }),
      prompt('Delegated work'),
    ]);
    // These are deliberately invalid: Sessions must never try to open them.
    await writeFile(path.join(home, 'state_5.sqlite'), 'not a database');
    await writeFile(path.join(home, '.codex-global-state.sqlite'), 'not a database');
    await writeFile(path.join(home, '.codex-global-state.json'), 'not json');

    const snapshot = await new SessionService(home).getCodexSnapshot();
    expect(snapshot.warnings).toEqual([]);
    expect(snapshot.threads).toHaveLength(3);
    expect(snapshot).not.toHaveProperty('projects');
    expect(snapshot.threads[0]).toMatchObject({
      id: ID,
      title: 'Actual first prompt',
      cwd: '/repo/two',
      gitBranch: 'main',
      createdAt: START,
      updatedAt: END,
      model: 'model-two',
      tokensUsed: 200,
      sizeBytes: firstBytes + secondBytes,
      segmentCount: 2,
      archived: false,
      subagent: false,
      parentThreadId: null,
    });
    expect(snapshot.threads[0]).not.toHaveProperty('projectBucket');
    expect(snapshot.threads.find((thread) => thread.id === ARCHIVED_ID)).toMatchObject({ archived: true, title: 'Archived work' });
    expect(snapshot.threads.find((thread) => thread.id === CHILD_ID)).toMatchObject({ subagent: true, parentThreadId: ID, model: 'fallback-provider' });
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

it('reads legacy Codex token events and tolerates damaged files while warning', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'foundry-codex-partial-'));
  try {
    const file = path.join(home, 'sessions', `${ID}.jsonl`);
    await transcript(file, [
      meta(ID),
      prompt('你好，世界'),
      {
        type: 'event_msg',
        timestamp: END,
        payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 42 } } },
      },
    ]);
    await writeFile(file, `${await readFile(file, 'utf8')}\n{"incomplete":`);
    await writeFile(path.join(home, 'sessions/broken.jsonl.zst'), 'invalid compressed stream');
    const snapshot = await new SessionService(home).getCodexSnapshot();
    expect(snapshot.threads).toHaveLength(1);
    expect(snapshot.threads[0]).toMatchObject({ title: '你好，世界', tokensUsed: 42 });
    expect(snapshot.warnings).toEqual([{ code: 'TRANSCRIPT_FILES_UNREADABLE', count: 2 }]);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

it('reports missing transcript directories and supports empty directories', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'foundry-sessions-missing-'));
  try {
    const service = new SessionService(home, home);
    await expect(service.getCodexSnapshot()).rejects.toMatchObject({ code: 'CODEX_DATA_NOT_FOUND' });
    await expect(service.getClaudeSnapshot()).rejects.toMatchObject({ code: 'CLAUDE_DATA_NOT_FOUND' });
    await mkdir(path.join(home, 'sessions'));
    await mkdir(path.join(home, 'projects'));
    const codexSnapshot = await service.getCodexSnapshot();
    const claudeSnapshot = await service.getClaudeSnapshot();
    expect(codexSnapshot.threads).toEqual([]);
    expect(claudeSnapshot.threads).toEqual([]);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

it('reads Claude JSONL directly, ignores indexes and discovers nested compressed subagents', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'foundry-claude-'));
  try {
    const directory = path.join(home, 'projects', '-repo-one');
    await transcript(path.join(directory, `${ID}.jsonl`), [
      { type: 'user', sessionId: ID, timestamp: START, cwd: '/repo/one', gitBranch: 'main', message: { role: 'user', content: 'First prompt' } },
      { type: 'custom-title', customTitle: 'My title' },
      ...['text', 'tool_use'].map((type) => ({
        type: 'assistant',
        timestamp: END,
        sessionId: ID,
        message: { id: 'response-one', role: 'assistant', model: 'claude-one', content: [{ type }], usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 2, cache_read_input_tokens: 3 } },
      })),
    ]);
    await writeFile(path.join(directory, 'sessions-index.json'), JSON.stringify({ entries: [{ sessionId: ID, summary: 'Wrong title', projectPath: '/wrong/path', modified: '2099-01-01' }] }));
    const childBytes = await transcript(path.join(directory, ID, 'subagents/agent-child.jsonl.zst'), [
      { type: 'user', sessionId: ID, timestamp: START, cwd: '/repo/one', isSidechain: true, message: { role: 'user', content: [{ type: 'text', text: 'Child task' }] } },
      { type: 'assistant', timestamp: END, message: { role: 'assistant', model: 'claude-two', usage: { input_tokens: 4, output_tokens: 3 } } },
    ], true);
    const snapshot = await new SessionService('/missing', home).getClaudeSnapshot();
    expect(snapshot.warnings).toEqual([]);
    expect(snapshot.threads).toHaveLength(2);
    expect(snapshot.threads.find((thread) => thread.id === ID)).toMatchObject({ title: 'My title', cwd: '/repo/one', createdAt: START, updatedAt: END, gitBranch: 'main', tokensUsed: 20, subagent: false });
    expect(snapshot.threads.find((thread) => thread.id === 'agent-child')).toMatchObject({ title: 'Child task', subagent: true, parentThreadId: ID, tokensUsed: 7, sizeBytes: childBytes });
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

it.each([
  { parent_thread_id: ID },
  { source: { subagent: { parent_thread_id: ID } } },
  { thread_source: { subagent: { parent_thread_id: ID } } },
])('preserves Codex parent relationships across continuation segments: %j', async (source) => {
  const home = await mkdtemp(path.join(tmpdir(), 'foundry-codex-parent-'));
  try {
    await transcript(path.join(home, 'sessions', `${CHILD_ID}.jsonl`), [meta(CHILD_ID, source), prompt('Child work')]);
    await transcript(path.join(home, 'sessions', `later-${CHILD_ID}.jsonl.zst`), [codexUsage(10)], true);
    const snapshot = await new SessionService(home).getCodexSnapshot();
    expect(snapshot.threads).toMatchObject([{ id: CHILD_ID, subagent: true, parentThreadId: ID, segmentCount: 2 }]);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

it('uses the Claude subagent directory when sessionId is absent', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'foundry-claude-parent-'));
  try {
    await transcript(path.join(home, 'projects/repo', ID, 'subagents/agent-child.jsonl'), [{ type: 'user', timestamp: START, message: { role: 'user', content: 'Child task' } }]);
    const snapshot = await new SessionService('/missing', home).getClaudeSnapshot();
    expect(snapshot.threads).toMatchObject([{ id: 'agent-child', subagent: true, parentThreadId: ID }]);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

it('serves both transcript sources and missing-data errors through the sessions API', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'foundry-sessions-api-'));
  const storage = openFoundryStorage(path.join(root, 'storage'));
  const codexHome = path.join(root, 'codex');
  const claudeHome = path.join(root, 'claude');
  const app = createApiApp(storage, { sessionService: new SessionService(codexHome, claudeHome) });
  try {
    const missingCodex = await app.request('/api/sessions/codex');
    const missingClaude = await app.request('/api/sessions/claude');
    expect(missingCodex.status).toBe(404);
    expect(missingClaude.status).toBe(404);
    await transcript(path.join(codexHome, 'sessions', `${ID}.jsonl.zst`), [meta(ID), prompt('Codex API thread')], true);
    await transcript(path.join(claudeHome, 'projects/repo', `${ID}.jsonl`), [{ type: 'user', timestamp: START, sessionId: ID, message: { role: 'user', content: 'Claude API thread' } }]);
    for (const source of ['codex', 'claude']) {
      const response = await app.request(`/api/sessions/${source}`);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ source, threads: [{ id: ID, title: `${source === 'codex' ? 'Codex' : 'Claude'} API thread` }], warnings: [] });
    }
  } finally {
    storage.close();
    await rm(root, { recursive: true, force: true });
  }
});
