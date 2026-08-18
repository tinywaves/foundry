import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  deriveInstallationState,
  skillDistributionOperations,
  skillIpcChannels,
  skillRevisionReasons,
  skillTargetKinds,
} from './skill-contract';

const observedAt = 1_723_952_400_000;
const firstFingerprint = 'a'.repeat(64);
const secondFingerprint = 'b'.repeat(64);
const thirdFingerprint = 'c'.repeat(64);

test('derives Synced when Store, distribution, and target fingerprints match', () => {
  assert.deepEqual(deriveInstallationState({
    store: { status: 'available', fingerprint: firstFingerprint, observedAt },
    distribution: {
      revisionId: '00000000-0000-4000-8000-000000000001',
      fingerprint: firstFingerprint,
      recordedAt: observedAt,
    },
    target: { status: 'available', fingerprint: firstFingerprint, observedAt },
  }), { kind: 'known', state: 'synced' });
});

test('derives Outdated when the target still matches an older distribution', () => {
  assert.deepEqual(deriveInstallationState({
    store: { status: 'available', fingerprint: secondFingerprint, observedAt },
    distribution: {
      revisionId: '00000000-0000-4000-8000-000000000001',
      fingerprint: firstFingerprint,
      recordedAt: observedAt,
    },
    target: { status: 'available', fingerprint: firstFingerprint, observedAt },
  }), { kind: 'known', state: 'outdated' });
});

test('derives Drifted when Store still matches the distribution but target changed', () => {
  assert.deepEqual(deriveInstallationState({
    store: { status: 'available', fingerprint: firstFingerprint, observedAt },
    distribution: {
      revisionId: '00000000-0000-4000-8000-000000000001',
      fingerprint: firstFingerprint,
      recordedAt: observedAt,
    },
    target: { status: 'available', fingerprint: secondFingerprint, observedAt },
  }), { kind: 'known', state: 'drifted' });
});

test('derives Diverged whenever both Store and target departed from the baseline', () => {
  const distribution = {
    revisionId: '00000000-0000-4000-8000-000000000001',
    fingerprint: firstFingerprint,
    recordedAt: observedAt,
  };

  assert.deepEqual(deriveInstallationState({
    store: { status: 'available', fingerprint: secondFingerprint, observedAt },
    distribution,
    target: { status: 'available', fingerprint: thirdFingerprint, observedAt },
  }), { kind: 'known', state: 'diverged' });
  assert.deepEqual(deriveInstallationState({
    store: { status: 'available', fingerprint: secondFingerprint, observedAt },
    distribution,
    target: { status: 'available', fingerprint: secondFingerprint, observedAt },
  }), { kind: 'known', state: 'diverged' });
});

test('derives Missing from an observed absent target before inspecting Store content', () => {
  assert.deepEqual(deriveInstallationState({
    store: { status: 'unreadable', observedAt },
    distribution: null,
    target: { status: 'missing', observedAt },
  }), { kind: 'known', state: 'missing' });
});

test('reports the fact that prevents installation state derivation', () => {
  const available = {
    status: 'available' as const,
    fingerprint: firstFingerprint,
    observedAt,
  };
  const baseline = {
    revisionId: '00000000-0000-4000-8000-000000000001',
    fingerprint: firstFingerprint,
    recordedAt: observedAt,
  };

  assert.deepEqual(deriveInstallationState({
    store: available,
    distribution: baseline,
    target: { status: 'unreadable', observedAt },
  }), { kind: 'unavailable', reason: 'target-unreadable' });
  assert.deepEqual(deriveInstallationState({
    store: { status: 'missing', observedAt },
    distribution: baseline,
    target: available,
  }), { kind: 'unavailable', reason: 'store-missing' });
  assert.deepEqual(deriveInstallationState({
    store: { status: 'unreadable', observedAt },
    distribution: baseline,
    target: available,
  }), { kind: 'unavailable', reason: 'store-unreadable' });
  assert.deepEqual(deriveInstallationState({
    store: available,
    distribution: null,
    target: available,
  }), { kind: 'unavailable', reason: 'distribution-baseline-missing' });
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
