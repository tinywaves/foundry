import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  PROMPT_CONTENT_MAX_UTF8_BYTES,
  PROMPT_DESCRIPTION_MAX_CODE_POINTS,
  PROMPT_TITLE_MAX_CODE_POINTS,
} from '../../../../shared/prompt-contract';
import {
  createPromptFormValues,
  getPromptFormApiErrorState,
  hasPromptFormChanges,
  setPromptFormField,
  validatePromptForm,
} from './prompt-form-model';
import type { PromptFormValidation } from './prompt-form-model';

function assertValid(
  result: PromptFormValidation,
): asserts result is Extract<PromptFormValidation, { ok: true }> {
  assert.equal(result.ok, true);
}

function assertInvalid(
  result: PromptFormValidation,
): asserts result is Extract<PromptFormValidation, { ok: false }> {
  assert.equal(result.ok, false);
}

test('creates empty and detail-backed Prompt form values', () => {
  assert.deepEqual(createPromptFormValues(), {
    title: '',
    description: '',
    content: '',
  });
  assert.deepEqual(createPromptFormValues({
    id: 'prompt-1',
    title: 'Title',
    description: null,
    content: '  exact\r\ncontent  ',
    currentVersion: 1,
    createdAt: 1,
    updatedAt: 1,
  }), {
    title: 'Title',
    description: '',
    content: '  exact\r\ncontent  ',
  });
});

test('detects exact field changes against the loaded baseline', () => {
  const initial = createPromptFormValues();
  assert.equal(hasPromptFormChanges(initial, initial), false);
  const changed = setPromptFormField(initial, 'content', 'Prompt');
  assert.equal(hasPromptFormChanges(changed, initial), true);
  assert.equal(
    hasPromptFormChanges(setPromptFormField(changed, 'content', ''), initial),
    false,
  );
});

test('normalizes metadata while preserving Prompt content exactly', () => {
  const content = '  first line\r\n    second line  ';
  const result = validatePromptForm({
    title: '  Title  ',
    description: '  Description  ',
    content,
  });
  assertValid(result);
  assert.deepEqual(result.input, {
    title: 'Title',
    description: 'Description',
    content,
  });

  const noDescription = validatePromptForm({
    title: 'Title',
    description: ' '.repeat(3),
    content: 'Prompt',
  });
  assertValid(noDescription);
  assert.equal(noDescription.input.description, null);
});

test('validates required fields and title control characters', () => {
  const required = validatePromptForm({ title: ' ', description: '', content: '\n\t' });
  assertInvalid(required);
  assert.equal(required.errors.title, 'This field is required.');
  assert.equal(required.errors.content, 'This field is required.');

  const control = validatePromptForm({
    title: 'First\nSecond',
    description: '',
    content: 'Prompt',
  });
  assertInvalid(control);
  assert.equal(control.errors.title, 'Control characters are not allowed.');
});

test('counts Unicode code points and UTF-8 content bytes', () => {
  const valid = validatePromptForm({
    title: '😀'.repeat(PROMPT_TITLE_MAX_CODE_POINTS),
    description: '😀'.repeat(PROMPT_DESCRIPTION_MAX_CODE_POINTS),
    content: 'a'.repeat(PROMPT_CONTENT_MAX_UTF8_BYTES),
  });
  assertValid(valid);

  const invalid = validatePromptForm({
    title: '😀'.repeat(PROMPT_TITLE_MAX_CODE_POINTS + 1),
    description: '😀'.repeat(PROMPT_DESCRIPTION_MAX_CODE_POINTS + 1),
    content: `${'a'.repeat(PROMPT_CONTENT_MAX_UTF8_BYTES - 3)}😀`,
  });
  assertInvalid(invalid);
  assert.equal(
    invalid.errors.title,
    `Use at most ${PROMPT_TITLE_MAX_CODE_POINTS} characters.`,
  );
  assert.equal(
    invalid.errors.description,
    `Use at most ${PROMPT_DESCRIPTION_MAX_CODE_POINTS} characters.`,
  );
  assert.equal(
    invalid.errors.content,
    `Use at most ${PROMPT_CONTENT_MAX_UTF8_BYTES} bytes of UTF-8 text.`,
  );
});

test('projects recognized Prompt API fields and retains a general error when needed', () => {
  assert.deepEqual(getPromptFormApiErrorState({
    code: 'invalid-input',
    message: 'Prompt input is invalid.',
    fields: [{ field: 'title', message: 'Title is invalid.' }],
  }), {
    errors: { title: 'Title is invalid.' },
    generalError: undefined,
  });
  assert.deepEqual(getPromptFormApiErrorState({
    code: 'invalid-input',
    message: 'Prompt input is invalid.',
    fields: [{ field: 'unknown', message: 'Unknown field.' }],
  }), {
    errors: {},
    generalError: 'Prompt input is invalid.',
  });
  assert.deepEqual(getPromptFormApiErrorState({
    code: 'internal',
    message: 'Prompt could not be saved.',
  }), {
    errors: {},
    generalError: 'Prompt could not be saved.',
  });
});
