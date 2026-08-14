import assert from 'node:assert/strict';
import { test } from 'vitest';
import { getPromptVersionSelectionAction } from './prompt-history-model';

test('returns to Current without treating the existing draft as historical content', () => {
  assert.deepEqual(getPromptVersionSelectionAction({
    currentVersion: 3,
    isDirty: true,
    requestedVersion: 3,
    selectedVersion: 1,
  }), { type: 'show-current' });
});

test('does nothing when the selected historical version is chosen again', () => {
  assert.deepEqual(getPromptVersionSelectionAction({
    currentVersion: 3,
    isDirty: false,
    requestedVersion: 2,
    selectedVersion: 2,
  }), { type: 'none' });
});

test('requires discard confirmation only for dirty historical selection', () => {
  assert.deepEqual(getPromptVersionSelectionAction({
    currentVersion: 3,
    isDirty: true,
    requestedVersion: 1,
  }), { type: 'confirm-discard', version: 1 });
  assert.deepEqual(getPromptVersionSelectionAction({
    currentVersion: 3,
    isDirty: false,
    requestedVersion: 1,
  }), { type: 'load', version: 1 });
});
