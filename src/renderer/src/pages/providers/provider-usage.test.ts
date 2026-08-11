import assert from 'node:assert/strict';
import { test } from 'vitest';
import { canInitiateProviderDeletion } from './provider-usage';

test('allows deletion only when a Provider is not In use', () => {
  assert.equal(canInitiateProviderDeletion({ isInUse: false }), true);
  assert.equal(canInitiateProviderDeletion({ isInUse: true }), false);
});
