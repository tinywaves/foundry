import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  isPromptEditorExitDisabled,
  promptEditorListNavigateOptions,
  promptEditorListPath,
} from './prompt-editor-navigation';

test('targets the canonical Prompts list with replacement navigation', () => {
  assert.equal(promptEditorListPath, '/agent-extensions/prompts');
  assert.deepEqual(promptEditorListNavigateOptions, { replace: true });
});

test('keeps editor exits enabled while no unsafe operation is active', () => {
  assert.equal(isPromptEditorExitDisabled({
    isRestoring: false,
    isSaving: false,
    isVersionLoading: false,
  }), false);
});

test('disables editor exits for every unsafe operation', () => {
  const unsafeStates = [
    {
      isRestoring: false,
      isSaving: true,
      isVersionLoading: false,
    },
    {
      isRestoring: false,
      isSaving: false,
      isVersionLoading: true,
    },
    {
      isRestoring: true,
      isSaving: false,
      isVersionLoading: false,
    },
    {
      isRestoring: true,
      isSaving: true,
      isVersionLoading: true,
    },
  ];

  for (const state of unsafeStates) {
    assert.equal(isPromptEditorExitDisabled(state), true);
  }
});
