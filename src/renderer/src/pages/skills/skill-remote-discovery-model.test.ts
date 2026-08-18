import assert from 'node:assert/strict';
import { test } from 'vitest';
import type {
  SkillAddRemoteCandidateResult,
  SkillRemoteDetailView,
  SkillRemoteResultView,
} from '../../../../shared/skill-contract';
import {
  chooseRemoteVersion,
  createGitResolutionInput,
  createRemoteSearchInput,
  describeRemoteAddOutcome,
  describeRemoteFailure,
  findCurrentRemoteResult,
  replaceRemoteSearchResults,
} from './skill-remote-discovery-model';

const firstResult = remoteResult('00000000-0000-4000-8000-000000000101');
const secondResult = remoteResult('00000000-0000-4000-8000-000000000102');

test('normalizes explicit search and Git resolution inputs', () => {
  const spacedQuery = `${' '.repeat(2)}type${' '.repeat(3)}script${' '.repeat(2)}`;
  assert.deepEqual(createRemoteSearchInput('clawhub', spacedQuery), {
    provider: 'clawhub',
    query: 'type script',
  });
  assert.equal(createRemoteSearchInput('skills-sh', ' '.repeat(3)), null);
  assert.deepEqual(createGitResolutionInput(' https://github.com/example/skills ', ' main '), {
    sourceUrl: 'https://github.com/example/skills',
    requestedRef: 'main',
  });
  assert.deepEqual(createGitResolutionInput('git@example.com:skills.git', ''), {
    sourceUrl: 'git@example.com:skills.git',
    requestedRef: null,
  });
  assert.equal(createGitResolutionInput(' ', 'main'), null);
});

test('invalidates opaque results when a newer search generation replaces them', () => {
  const first = replaceRemoteSearchResults(null, {
    provider: 'clawhub',
    query: 'type',
  }, [firstResult]);
  const second = replaceRemoteSearchResults(first, {
    provider: 'clawhub',
    query: 'react',
  }, [secondResult]);

  assert.equal(findCurrentRemoteResult(first, firstResult.id, first.generation), firstResult);
  assert.equal(findCurrentRemoteResult(second, firstResult.id, first.generation), null);
  assert.equal(findCurrentRemoteResult(second, secondResult.id, second.generation), secondResult);
});

test('prefers a valid selection, then the recommended version, then the first version', () => {
  const details: SkillRemoteDetailView = {
    result: firstResult,
    versions: [
      {
        id: firstResult.id,
        version: '2.0.0',
        label: 'Latest',
        trackingMode: 'tracked',
        publishedAt: 20,
        changelog: null,
      },
      {
        id: secondResult.id,
        version: '1.0.0',
        label: '1.0.0',
        trackingMode: 'fixed',
        publishedAt: 10,
        changelog: null,
      },
    ],
    recommendedVersionId: firstResult.id,
  };
  assert.equal(chooseRemoteVersion(details, secondResult.id)?.version, '1.0.0');
  assert.equal(chooseRemoteVersion(details, 'missing')?.label, 'Latest');
  assert.equal(chooseRemoteVersion({ ...details, recommendedVersionId: null }, null)?.label, 'Latest');
});

test('describes duplicate-content reuse and actionable remote failures', () => {
  const result = {
    reusedPackage: true,
    skillPackage: { distributionName: 'typescript' },
  } as SkillAddRemoteCandidateResult;
  assert.deepEqual(describeRemoteAddOutcome(result), {
    title: 'Source Added to Existing Skill',
    message: 'typescript already had identical content.',
  });
  assert.equal(describeRemoteFailure({
    message: 'The remote provider is rate limited.',
    apiError: { code: 'rate-limited', retryAfterSeconds: 12 },
  }), 'The remote provider is rate limited. Retry in 12 seconds.');
  assert.equal(describeRemoteFailure({
    message: 'Search again.',
    apiError: { code: 'stale-result' },
  }), 'Search again. The previous result is no longer usable.');
});

function remoteResult(id: string): SkillRemoteResultView {
  return {
    id,
    provider: 'clawhub',
    sourceNativeId: 'owner/example',
    name: 'Example',
    description: null,
    publisher: 'owner',
    latestVersion: '1.0.0',
    canonicalWebUrl: 'https://clawhub.ai/owner/skills/example',
  };
}
