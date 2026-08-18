import assert from 'node:assert/strict';
import { test } from 'vitest';
import type {
  SkillApiResult,
  SkillWatchSessionStart,
} from '../../../../shared/skill-contract';
import { startSkillWatchSession } from './skill-watch-session';

const scan = {
  roots: [],
  rootsInspected: 0,
  packagesFound: 0,
  packagesImported: 0,
  installationsAdopted: 0,
  observationsUpdated: 0,
  warnings: [],
  rootFailures: [],
};

test('ends the exact session token when an active lifecycle is cleaned up', async () => {
  const ended: string[] = [];
  const started: string[] = [];
  const cleanup = startSkillWatchSession({
    begin: () => Promise.resolve({ ok: true, value: { sessionId: 'session-1', scan } }),
    end: (sessionId) => {
      ended.push(sessionId);
      return Promise.resolve({ ok: true, value: true });
    },
    onStarted: (value) => {
      started.push(value.sessionId);
    },
    onError: () => {},
  });
  await Promise.resolve();
  cleanup();
  cleanup();
  assert.deepEqual(started, ['session-1']);
  assert.deepEqual(ended, ['session-1']);
});

test('ends a late begin result without publishing it after cleanup', async () => {
  const begin = Promise.withResolvers<SkillApiResult<SkillWatchSessionStart>>();
  const ended: string[] = [];
  const started: string[] = [];
  const cleanup = startSkillWatchSession({
    begin: () => begin.promise,
    end: (sessionId) => {
      ended.push(sessionId);
      return Promise.resolve({ ok: true, value: true });
    },
    onStarted: (value) => {
      started.push(value.sessionId);
    },
    onError: () => {},
  });
  cleanup();
  begin.resolve({ ok: true, value: { sessionId: 'late-session', scan } });
  await begin.promise;
  await Promise.resolve();
  assert.deepEqual(started, []);
  assert.deepEqual(ended, ['late-session']);
});

test('reports active begin failures but ignores failures after cleanup', async () => {
  const messages: string[] = [];
  const activeFailure = startSkillWatchSession({
    begin: () => Promise.resolve({
      ok: false,
      error: { code: 'filesystem-unavailable', message: 'Watcher unavailable.' },
    }),
    end: () => Promise.resolve({ ok: true, value: true }),
    onStarted: () => {},
    onError: (message) => {
      messages.push(message);
    },
  });
  await Promise.resolve();
  activeFailure();

  const late = Promise.withResolvers<SkillApiResult<SkillWatchSessionStart>>();
  const cleanup = startSkillWatchSession({
    begin: () => late.promise,
    end: () => Promise.resolve({ ok: true, value: true }),
    onStarted: () => {},
    onError: (message) => {
      messages.push(message);
    },
  });
  cleanup();
  late.resolve({
    ok: false,
    error: { code: 'filesystem-unavailable', message: 'Late failure.' },
  });
  await late.promise;
  await Promise.resolve();
  assert.deepEqual(messages, ['Watcher unavailable.']);
});
