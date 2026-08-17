import assert from 'node:assert/strict';
import { test } from 'vitest';
import { promptLifecycleExitNavigateOptions } from './prompt-lifecycle-navigation';

test('commits Prompt lifecycle exits before mutation observers update', () => {
  assert.deepEqual(promptLifecycleExitNavigateOptions, {
    flushSync: true,
    replace: true,
  });
});
