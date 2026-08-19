import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  deriveInstallationSyncStatus,
  skillDistributionOperations,
  skillIpcChannels,
  skillRevisionReasons,
  skillTargetKinds,
} from './skill-contract';

const observedAt = 1_723_952_400_000;
const firstFingerprint = 'a'.repeat(64);
const secondFingerprint = 'b'.repeat(64);

test('derives current synchronization directly from Store and Target observations', () => {
  assert.equal(deriveInstallationSyncStatus({
    store: { status: 'available', fingerprint: firstFingerprint, observedAt },
    target: { status: 'available', fingerprint: firstFingerprint, observedAt },
  }), 'synced');
  assert.equal(deriveInstallationSyncStatus({
    store: { status: 'available', fingerprint: secondFingerprint, observedAt },
    target: { status: 'available', fingerprint: firstFingerprint, observedAt },
  }), 'different');
  assert.equal(deriveInstallationSyncStatus({
    store: { status: 'available', fingerprint: firstFingerprint, observedAt },
    target: { status: 'missing', observedAt },
  }), 'different');
});

test('reports unknown when current Store and Target content cannot be compared', () => {
  const available = {
    status: 'available' as const,
    fingerprint: firstFingerprint,
    observedAt,
  };

  assert.equal(deriveInstallationSyncStatus({
    store: available,
    target: { status: 'unreadable', observedAt },
  }), 'unknown');
  assert.equal(deriveInstallationSyncStatus({
    store: { status: 'missing', observedAt },
    target: available,
  }), 'unknown');
  assert.equal(deriveInstallationSyncStatus({
    store: { status: 'unreadable', observedAt },
    target: available,
  }), 'unknown');
});

test('publishes the approved local target, revision, distribution, and channel vocabulary', () => {
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
  assert.deepEqual(skillRevisionReasons, [
    'import',
    'distribution',
    'promotion',
    'remote-update',
  ]);
  assert.deepEqual(skillDistributionOperations, ['adoption', 'distribution', 'restore']);

  const channels = Object.values(skillIpcChannels);
  assert.equal(new Set(channels).size, channels.length);
  assert.equal(channels.every((channel) => channel.startsWith('skills:')), true);
});
