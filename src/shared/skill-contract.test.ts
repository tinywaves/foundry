import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  skillDistributionConflictCodes,
  skillIpcChannels,
  skillTargetKinds,
} from './skill-contract';

test('publishes current Skill Target and Distribution vocabulary', () => {
  assert.deepEqual(skillTargetKinds, [
    'generic-agent-skills',
    'claude-code',
    'gemini-cli',
    'opencode',
    'cursor',
    'github-copilot',
    'hermes',
    'openclaw',
    'codex-legacy',
    'custom',
  ]);
  assert.deepEqual(skillDistributionConflictCodes, [
    'target-disabled',
    'target-read-only',
    'target-unavailable',
    'duplicate-physical-target',
  ]);
});

test('exposes unique request channels without Watch or Revision operations', () => {
  const channels = Object.values(skillIpcChannels);
  assert.equal(new Set(channels).size, channels.length);
  assert.equal(channels.every((channel) => channel.startsWith('skills:')), true);
  assert.equal(channels.some((channel) => (/watch|revision|observation/).test(channel)), false);
});
