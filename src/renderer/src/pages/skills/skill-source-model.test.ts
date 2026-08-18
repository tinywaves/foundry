import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { SkillSourceView, SkillUpdateCheckResult } from '../../../../shared/skill-contract';
import {
  describeSkillSourceChecks,
  describeSkillUpdateResult,
  getSkillSourceCandidateId,
  getSkillSourceCheckedAt,
  getSkillSourceProviderLabel,
  getSkillSourceStatusPresentation,
  mergeSkillSourceChecks,
} from './skill-source-model';

function createSource(
  id: string,
  check: SkillSourceView['check'],
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
    observedContentFingerprint: 'a'.repeat(64),
    canonicalWebUrl: 'https://github.com/example/skills/tree/main/example',
    fetchedAt: 10,
    check,
    createdAt: 10,
    updatedAt: 10,
  };
}

test('presents fixed and tracked Source lifecycle states', () => {
  const fixed = createSource('fixed', { status: 'never' }, 'fixed');
  const unavailable = createSource('unavailable', { status: 'unavailable', checkedAt: 20 });
  assert.deepEqual(getSkillSourceStatusPresentation(fixed), {
    label: 'Fixed',
    variant: 'neutral',
  });
  assert.equal(getSkillSourceStatusPresentation(unavailable).label, 'Unavailable');
  assert.equal(getSkillSourceCheckedAt(fixed), null);
  assert.equal(getSkillSourceCheckedAt(unavailable), 20);
  assert.equal(getSkillSourceProviderLabel('clawhub'), 'ClawHub');
});

test('exposes only an active Update Candidate and merges check results by Source ID', () => {
  const first = createSource('first', { status: 'never' });
  const second = createSource('second', { status: 'never' });
  const updated = createSource('first', {
    status: 'update-available',
    checkedAt: 30,
    candidate: {
      id: 'candidate',
      sourceId: 'first',
      packageId: first.packageId,
      resolvedRevision: '2'.repeat(40),
      artifactDigest: null,
      canonicalWebUrl: first.canonicalWebUrl,
      checkedAt: 30,
    },
  });
  const candidate = updated.check.status === 'update-available'
    ? updated.check.candidate
    : assert.fail('Expected candidate.');
  const results: SkillUpdateCheckResult[] = [
    {
      status: 'update-available',
      source: updated,
      candidate,
    },
  ];
  assert.equal(getSkillSourceCandidateId(first), null);
  assert.equal(getSkillSourceCandidateId(updated), 'candidate');
  assert.deepEqual(mergeSkillSourceChecks([first, second], results), [updated, second]);
  assert.equal(mergeSkillSourceChecks(undefined, results), undefined);
});

test('summarizes manual checks and explicit Store updates without claiming distribution', () => {
  const current = createSource('current', { status: 'current', checkedAt: 20 });
  const unavailable = createSource('unavailable', { status: 'unavailable', checkedAt: 20 });
  assert.equal(
    describeSkillSourceChecks([{ status: 'current', source: current }]),
    'Tracked Sources are current.',
  );
  assert.equal(describeSkillSourceChecks([
    { status: 'current', source: current },
    { status: 'unavailable', source: unavailable },
  ]), '1 Source is unavailable.');

  const result = { contentChanged: true };
  assert.equal(
    describeSkillUpdateResult(result),
    'Store updated. Existing installations were left unchanged.',
  );
  assert.equal(
    describeSkillUpdateResult({ ...result, contentChanged: false }),
    'Source revision updated; Store content was already current.',
  );
});
