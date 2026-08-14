import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  getEmptyTrashDescription,
  getEmptyTrashSuccessMessage,
} from './prompt-trash-model';

test('describes Empty Trash with count-aware confirmation copy', () => {
  assert.equal(
    getEmptyTrashDescription(1),
    `1 Prompt is in Trash. It will no longer be accessible in Foundry. This can't be undone.`,
  );
  assert.equal(
    getEmptyTrashDescription(2),
    `2 Prompts are in Trash. They will no longer be accessible in Foundry. This can't be undone.`,
  );
});

test('reports the affected Empty Trash count', () => {
  assert.equal(getEmptyTrashSuccessMessage(1), 'Removed 1 Prompt from Trash.');
  assert.equal(getEmptyTrashSuccessMessage(2), 'Removed 2 Prompts from Trash.');
});
