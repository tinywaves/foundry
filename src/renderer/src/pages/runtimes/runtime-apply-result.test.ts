import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  getInitialRuntimeApplyDialogState,
  getRuntimeApplyDialogStateFromChatGptState,
  getRuntimeApplyRestartResolution,
  runtimeApplyResultTitles,
} from './runtime-apply-result';

test('maps every successful configuration source to its approved title', () => {
  assert.deepEqual(runtimeApplyResultTitles, {
    'provider-applied': 'Provider Applied',
    'defaults-restored': 'Defaults Restored',
    'provider-updated-and-applied': 'Provider Updated and Applied',
  });
});

test('starts Codex with ChatGPT detection and Claude Code with manual guidance', () => {
  assert.deepEqual(getInitialRuntimeApplyDialogState('codex'), { status: 'checking' });
  assert.deepEqual(getInitialRuntimeApplyDialogState('claude-code'), {
    status: 'manual',
    reason: 'claude-code',
  });
});

test('offers restart only when ChatGPT is running', () => {
  assert.deepEqual(getRuntimeApplyDialogStateFromChatGptState('running'), {
    status: 'restart-available',
  });
  assert.deepEqual(getRuntimeApplyDialogStateFromChatGptState('not-running'), {
    status: 'manual',
    reason: 'initial-not-running',
  });
  assert.deepEqual(getRuntimeApplyDialogStateFromChatGptState('unavailable'), {
    status: 'manual',
    reason: 'unavailable',
  });
});

test('closes only for a completed restart and maps failures to manual guidance', () => {
  assert.deepEqual(getRuntimeApplyRestartResolution('restarted'), { status: 'restarted' });
  assert.deepEqual(getRuntimeApplyRestartResolution('not-running'), {
    status: 'manual',
    reason: 'restart-not-running',
  });
  for (const result of [
    'quit-failed',
    'reopen-failed',
    'unavailable',
  ] as const) {
    assert.deepEqual(getRuntimeApplyRestartResolution(result), {
      status: 'manual',
      reason: result,
    });
  }
});
