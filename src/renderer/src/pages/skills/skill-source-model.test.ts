import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { SkillSourceView, SkillUpdateCheckResult } from '../../../../shared/skill-contract';
import {
  describeSkillSourceChecks,
  describeSkillUpdateResult,
  getSkillSourceCandidate,
  getSkillSourceProviderLabel,
  getSkillSourceStatusPresentation,
  mergeSkillSourceCheckResults,
} from './skill-source-model';

function createSource(
  id: string,
  trackingMode: SkillSourceView['trackingMode'] = 'tracked',
): SkillSourceView {
  return {
    id,
    packageId: '00000000-0000-4000-8000-000000000001',
    provider: 'git',
    trackingMode,
    sourceNativeId: 'https://github.com/example/skills.git',
    directoryProvider: null,
    catalogLocator: null,
    sourceUrl: 'https://github.com/example/skills.git',
    skillPath: 'example',
    requestedRef: trackingMode === 'tracked' ? 'main' : '1'.repeat(40),
    resolvedRevision: '1'.repeat(40),
    artifactDigest: null,
    observedContentFingerprint: 'v2:abc',
    canonicalWebUrl: 'https://github.com/example/skills/tree/main/example',
    fetchedAt: 10,
    createdAt: 10,
    updatedAt: 10,
  };
}

test('presents Source state from ephemeral check results', () => {
  const fixed = createSource('fixed', 'fixed');
  const tracked = createSource('tracked');
  assert.deepEqual(getSkillSourceStatusPresentation(fixed, undefined), {
    label: 'Fixed',
    variant: 'neutral',
  });
  assert.deepEqual(getSkillSourceStatusPresentation(tracked, undefined), {
    label: 'Not checked',
    variant: 'neutral',
  });
  assert.equal(getSkillSourceProviderLabel('clawhub'), 'ClawHub');
});

test('retains Update Candidates only in the current in-memory Map', () => {
  const source = createSource('source');
  const result: SkillUpdateCheckResult = {
    status: 'update-available',
    source,
    candidate: {
      sourceId: source.id,
      packageId: source.packageId,
      resolvedRevision: '2'.repeat(40),
      artifactDigest: null,
      canonicalWebUrl: source.canonicalWebUrl,
      checkedAt: 30,
    },
  };
  const checks = mergeSkillSourceCheckResults(new Map(), [result]);
  assert.equal(checks.get(source.id), result);
  assert.deepEqual(getSkillSourceCandidate(checks.get(source.id)), result.candidate);
  assert.equal(getSkillSourceCandidate(undefined), null);
});

test('summarizes checks and Store-only updates without claiming Distribution', () => {
  const current = createSource('current');
  assert.equal(
    describeSkillSourceChecks([{ status: 'current', source: current }]),
    'Tracked Sources are current.',
  );
  assert.equal(
    describeSkillUpdateResult({ contentChanged: true }),
    'Store updated. Existing installations were left unchanged.',
  );
});
