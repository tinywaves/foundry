import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  getPromptEditorBackNavigation,
  getPromptEditorNavigateOptions,
  isPromptEditorExitDisabled,
  promptEditorListNavigateOptions,
  promptEditorListPath,
} from './prompt-editor-navigation';

test('targets the canonical Prompts list with replacement navigation', () => {
  assert.equal(promptEditorListPath, '/agent-extensions/prompts');
  assert.deepEqual(promptEditorListNavigateOptions, { replace: true });
});

test('records list and view entry sources for contextual editor exits', () => {
  assert.deepEqual(getPromptEditorNavigateOptions('list'), {
    state: { promptEditorSource: 'list' },
  });
  assert.deepEqual(getPromptEditorNavigateOptions('view'), {
    state: { promptEditorSource: 'view' },
  });
});

test('returns through history with a source-specific label for known entries', () => {
  assert.deepEqual(getPromptEditorBackNavigation({ promptEditorSource: 'list' }), {
    kind: 'history',
    label: 'Back to Prompts',
  });
  assert.deepEqual(getPromptEditorBackNavigation({ promptEditorSource: 'view' }), {
    kind: 'history',
    label: 'Back to Prompt',
  });
});

test('falls back to the canonical list for direct or malformed entries', () => {
  const fallback = {
    kind: 'path',
    label: 'Back to Prompts',
    options: { replace: true },
    path: '/agent-extensions/prompts',
  };
  assert.deepEqual(getPromptEditorBackNavigation(undefined), fallback);
  assert.deepEqual(getPromptEditorBackNavigation(null), fallback);
  assert.deepEqual(getPromptEditorBackNavigation('view'), fallback);
  assert.deepEqual(
    getPromptEditorBackNavigation({ promptEditorSource: 'unknown' }),
    fallback,
  );
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
