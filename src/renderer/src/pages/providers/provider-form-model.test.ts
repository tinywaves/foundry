import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ProviderAvatarSelection } from '../../../../shared/provider-contract';
import {
  createProviderFormValues,
  getProviderAvatarUpdate,
  getProviderFormApiErrorState,
  hasProviderFormChanges,
  isValidProviderConnectionSummary,
  setProviderFormField,
  validateProviderConnectionForm,
  validateProviderForm,
} from './provider-form-model';
import type { ProviderFormValidation } from './provider-form-model';

const pngSelection: ProviderAvatarSelection = {
  fileName: 'avatar.png',
  avatar: {
    mimeType: 'image/png',
    bytes: Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  },
};

function assertValid(
  result: ProviderFormValidation,
): asserts result is Extract<ProviderFormValidation, { ok: true }> {
  assert.equal(result.ok, true);
}

function assertInvalid(
  result: ProviderFormValidation,
): asserts result is Extract<ProviderFormValidation, { ok: false }> {
  assert.equal(result.ok, false);
}

test('initializes runtime-specific Provider form values', () => {
  const codex = createProviderFormValues('codex');
  assert.deepEqual(codex.modelConfig, { defaultModel: '' });

  const claude = createProviderFormValues('claude-code');
  assert.deepEqual(claude.modelConfig, {
    sonnet: { displayName: 'Sonnet', requestModel: '' },
    opus: { displayName: 'Opus', requestModel: '' },
    fable: { displayName: 'Fable', requestModel: '' },
    haiku: { displayName: 'Haiku', requestModel: '' },
    subagent: { requestModel: '' },
    defaultFallbackModel: '',
  });
});

test('detects changes against each runtime form baseline', () => {
  const codexInitial = createProviderFormValues('codex');
  const claudeInitial = createProviderFormValues('claude-code');

  assert.equal(hasProviderFormChanges(
    codexInitial,
    codexInitial,
    { kind: 'preserve' },
  ), false);
  assert.equal(hasProviderFormChanges(
    claudeInitial,
    claudeInitial,
    { kind: 'preserve' },
  ), false);

  const changedCodex = setProviderFormField(codexInitial, 'name', 'Provider');
  assert.equal(hasProviderFormChanges(
    changedCodex,
    codexInitial,
    { kind: 'preserve' },
  ), true);
  assert.equal(hasProviderFormChanges(
    setProviderFormField(changedCodex, 'name', ''),
    codexInitial,
    { kind: 'preserve' },
  ), false);

  assert.equal(hasProviderFormChanges(
    codexInitial,
    codexInitial,
    { kind: 'replace', selection: pngSelection },
  ), true);
  assert.equal(hasProviderFormChanges(
    codexInitial,
    codexInitial,
    { kind: 'remove' },
  ), true);
  assert.equal(hasProviderFormChanges(
    claudeInitial,
    codexInitial,
    { kind: 'preserve' },
  ), true);
});

test('normalizes Codex form values without changing a non-empty API key', () => {
  let values = createProviderFormValues('codex');
  values = setProviderFormField(values, 'name', ' Custom Provider ');
  values = setProviderFormField(values, 'baseUrl', ' https://api.example.com/v1/ ');
  values = setProviderFormField(values, 'apiKey', '  secret key  ');
  values = setProviderFormField(values, 'remark', '  note  ');
  values = setProviderFormField(
    values,
    'officialWebsite',
    ' https://example.com/provider?source=foundry#setup ',
  );
  values = setProviderFormField(values, 'modelConfig.defaultModel', ' gpt-default ');

  const result = validateProviderForm(values);
  assertValid(result);
  assert.deepEqual(result.input, {
    runtime: 'codex',
    name: 'Custom Provider',
    baseUrl: 'https://api.example.com/v1/',
    apiKey: '  secret key  ',
    remark: 'note',
    officialWebsite: 'https://example.com/provider?source=foundry#setup',
    modelConfig: { version: 1, defaultModel: 'gpt-default' },
  });
});

test('requires every Claude Code request model and builds the approved mapping', () => {
  let values = createProviderFormValues('claude-code');
  values = setProviderFormField(values, 'name', 'Claude Provider');
  values = setProviderFormField(values, 'baseUrl', 'https://claude.example.com');

  const invalid = validateProviderForm(values);
  assertInvalid(invalid);
  assert.deepEqual(new Set(Object.keys(invalid.errors)), new Set([
    'modelConfig.defaultFallbackModel',
    'modelConfig.fable.requestModel',
    'modelConfig.haiku.requestModel',
    'modelConfig.opus.requestModel',
    'modelConfig.sonnet.requestModel',
    'modelConfig.subagent.requestModel',
  ]));

  values = setProviderFormField(values, 'modelConfig.sonnet.requestModel', 'claude-sonnet');
  values = setProviderFormField(values, 'modelConfig.opus.requestModel', 'claude-opus');
  values = setProviderFormField(values, 'modelConfig.fable.requestModel', 'claude-fable');
  values = setProviderFormField(values, 'modelConfig.haiku.requestModel', 'claude-haiku');
  values = setProviderFormField(values, 'modelConfig.subagent.requestModel', 'claude-haiku');
  values = setProviderFormField(values, 'modelConfig.defaultFallbackModel', 'claude-sonnet');

  const valid = validateProviderForm(values);
  assertValid(valid);
  assert.equal(valid.input.runtime, 'claude-code');
  assert.deepEqual(valid.input.modelConfig, {
    version: 1,
    sonnet: { displayName: 'Sonnet', requestModel: 'claude-sonnet' },
    opus: { displayName: 'Opus', requestModel: 'claude-opus' },
    fable: { displayName: 'Fable', requestModel: 'claude-fable' },
    haiku: { displayName: 'Haiku', requestModel: 'claude-haiku' },
    subagent: { requestModel: 'claude-haiku' },
    defaultFallbackModel: 'claude-sonnet',
  });
});

test('rejects unsafe URLs and preserves the three avatar update states', () => {
  let values = createProviderFormValues('codex');
  values = setProviderFormField(values, 'name', 'Provider');
  values = setProviderFormField(values, 'baseUrl', 'https://user@example.com?token=secret');
  values = setProviderFormField(values, 'officialWebsite', 'file:///tmp/provider');
  values = setProviderFormField(values, 'modelConfig.defaultModel', 'gpt-default');

  const result = validateProviderForm(values);
  assertInvalid(result);
  assert.equal(result.errors.baseUrl, 'URL credentials are not allowed.');
  assert.equal(result.errors.officialWebsite, 'Use an HTTP or HTTPS URL.');

  assert.deepEqual(getProviderAvatarUpdate({ kind: 'preserve' }), {});
  assert.deepEqual(getProviderAvatarUpdate({ kind: 'remove' }), { avatar: null });
  assert.deepEqual(
    getProviderAvatarUpdate({ kind: 'replace', selection: pngSelection }),
    { avatar: pngSelection.avatar },
  );
});

test('validates only connection fields for a draft Provider test', () => {
  let values = createProviderFormValues('claude-code');
  values = setProviderFormField(values, 'baseUrl', ' https://claude.example.com/v1 ');
  values = setProviderFormField(values, 'apiKey', '  draft key  ');

  const valid = validateProviderConnectionForm(values);
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.input, {
    runtime: 'claude-code',
    baseUrl: 'https://claude.example.com/v1',
    apiKey: '  draft key  ',
  });

  values = setProviderFormField(values, 'baseUrl', 'https://claude.example.com?secret=value');
  const invalid = validateProviderConnectionForm(values);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.errors.baseUrl, 'Base URL cannot contain a query or fragment.');
});

test('projects Provider API errors into form, avatar, and general messages', () => {
  const projected = getProviderFormApiErrorState({
    code: 'invalid-input',
    message: 'Provider input is invalid.',
    fields: [
      { field: 'name', message: 'Name is invalid.' },
      { field: 'avatar.bytes', message: 'Avatar is invalid.' },
      { field: 'unsupported', message: 'Unsupported field.' },
    ],
  });
  assert.deepEqual(projected, {
    formErrors: { name: 'Name is invalid.' },
    avatarError: 'Avatar is invalid.',
    generalError: 'Provider input is invalid.',
  });

  assert.deepEqual(getProviderFormApiErrorState({
    code: 'invalid-input',
    message: 'Known fields are invalid.',
    fields: [{ field: 'baseUrl', message: 'Base URL is invalid.' }],
  }), {
    formErrors: { baseUrl: 'Base URL is invalid.' },
    avatarError: undefined,
    generalError: undefined,
  });
  assert.equal(getProviderFormApiErrorState({
    code: 'internal',
    message: 'Provider could not be saved.',
  }).generalError, 'Provider could not be saved.');
});

test('accepts only complete connected or failed draft-test results', () => {
  assert.equal(isValidProviderConnectionSummary({
    status: 'connected',
    lastTestedAt: 1,
    lastError: null,
  }), true);
  assert.equal(isValidProviderConnectionSummary({
    status: 'failed',
    lastTestedAt: 1,
    lastError: 'Unavailable',
  }), true);
  assert.equal(isValidProviderConnectionSummary({
    status: 'never-tested',
    lastTestedAt: null,
    lastError: null,
  }), false);
  assert.equal(isValidProviderConnectionSummary({
    status: 'connected',
    lastTestedAt: 1,
    lastError: 'Unexpected',
  }), false);
  assert.equal(isValidProviderConnectionSummary({
    status: 'failed',
    lastTestedAt: 1,
    lastError: null,
  }), false);
});
