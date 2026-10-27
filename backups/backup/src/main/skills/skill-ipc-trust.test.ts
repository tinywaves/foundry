import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isTrustedSkillMainFrame } from './skill-ipc-trust';

test('accepts only registered main-frame Skills requests', () => {
  const mainFrame = {};
  const trustedIds = new Set([7]);

  assert.equal(isTrustedSkillMainFrame(trustedIds, {
    sender: { id: 7, mainFrame },
    senderFrame: mainFrame,
  }), true);
  assert.equal(isTrustedSkillMainFrame(trustedIds, {
    sender: { id: 8, mainFrame },
    senderFrame: mainFrame,
  }), false);
  assert.equal(isTrustedSkillMainFrame(trustedIds, {
    sender: { id: 7, mainFrame },
    senderFrame: null,
  }), false);
  assert.equal(isTrustedSkillMainFrame(trustedIds, {
    sender: { id: 7, mainFrame },
    senderFrame: {},
  }), false);
});
