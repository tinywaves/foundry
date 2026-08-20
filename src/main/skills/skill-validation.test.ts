import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SkillOperationError } from './skill-error';
import {
  normalizeSkillDistributionName,
  parseSkillApplyUpdateInput,
  parseSkillCanonicalWebUrl,
  parseSkillContentFingerprint,
  parseSkillDirectoryProvider,
  parseSkillDiscoveryProvider,
  parseSkillDistributionInput,
  parseSkillDistributionName,
  parseSkillFileTarget,
  parseSkillId,
  parseSkillInstallationCommandInput,
  parseSkillInstallationId,
  parseSkillRemoteQuery,
  parseSkillRemoteRef,
  parseSkillRemoteRevision,
  parseSkillRelativePath,
  parseSkillScanDepth,
  parseSkillSourceId,
  parseSkillSourceProvider,
  parseSkillSourceTrackingMode,
  parseSkillSourceUrl,
  parseSkillTargetId,
  parseSkillTargetKind,
  parseSkillTargetPolicyInput,
} from './skill-validation';

const skillId = '00000000-0000-4000-8000-000000000001';
const firstTargetId = '00000000-0000-4000-8000-000000000002';
const secondTargetId = '00000000-0000-4000-8000-000000000003';
const installationId = '00000000-0000-4000-8000-000000000004';
const sourceId = '00000000-0000-4000-8000-000000000005';

test('validates current Skill identities without echoing rejected values', () => {
  for (const [parser, id] of [
    [parseSkillId, skillId],
    [parseSkillTargetId, firstTargetId],
    [parseSkillInstallationId, installationId],
    [parseSkillSourceId, sourceId],
  ] as const) {
    assert.equal(parser(id), id);
    assert.throws(() => parser('sensitive-invalid-id'), SkillOperationError);
  }
});

test('validates versioned fingerprints and safe Distribution names and paths', () => {
  const v1 = `v1:${'a'.repeat(64)}`;
  const v2 = `v2:${'b'.repeat(64)}`;
  assert.equal(parseSkillContentFingerprint(v1), v1);
  assert.equal(parseSkillContentFingerprint(v2), v2);
  assert.throws(() => parseSkillContentFingerprint('a'.repeat(64)), SkillOperationError);
  assert.equal(parseSkillDistributionName('My.Skill_1'), 'My.Skill_1');
  assert.equal(normalizeSkillDistributionName('Cafe\u{301}'), 'caf\u{E9}');
  assert.equal(parseSkillRelativePath('references/guide.md'), 'references/guide.md');
  for (const value of ['', '..', 'nested/skill', String.raw`nested\skill`, 'CON']) {
    assert.throws(() => parseSkillDistributionName(value), SkillOperationError);
  }
  for (const value of ['', '../secret', '/SKILL.md', String.raw`a\b`]) {
    assert.throws(() => parseSkillRelativePath(value), SkillOperationError);
  }
});

test('validates remote provenance without accepting credential-bearing URLs', () => {
  assert.equal(parseSkillSourceProvider('git'), 'git');
  assert.equal(parseSkillDirectoryProvider('skills-sh'), 'skills-sh');
  assert.equal(parseSkillDiscoveryProvider('clawhub'), 'clawhub');
  assert.equal(parseSkillSourceTrackingMode('tracked'), 'tracked');
  assert.equal(parseSkillRemoteQuery('typescript'), 'typescript');
  assert.equal(parseSkillRemoteRevision('a'.repeat(40)), 'a'.repeat(40));
  assert.equal(parseSkillRemoteRef('refs/heads/main'), 'refs/heads/main');
  assert.equal(
    parseSkillSourceUrl('https://github.com/example/skills.git'),
    'https://github.com/example/skills.git',
  );
  assert.equal(
    parseSkillCanonicalWebUrl('https://github.com/example/skills'),
    'https://github.com/example/skills',
  );
  assert.throws(
    () => parseSkillSourceUrl('https://token@github.com/example/skills.git'),
    SkillOperationError,
  );
});

test('parses current file, policy, Distribution, Uninstall, and Update payloads', () => {
  assert.deepEqual(parseSkillFileTarget({ skillId, relativePath: 'SKILL.md' }), {
    skillId,
    relativePath: 'SKILL.md',
  });
  assert.deepEqual(parseSkillTargetPolicyInput({
    targetId: firstTargetId,
    enabled: true,
    maxScanDepth: 6,
    allowSymlinkEscape: true,
  }), {
    targetId: firstTargetId,
    enabled: true,
    maxScanDepth: 6,
    allowSymlinkEscape: true,
  });
  assert.deepEqual(parseSkillDistributionInput({
    skillId,
    targetIds: [firstTargetId, secondTargetId],
  }), { skillId, targetIds: [firstTargetId, secondTargetId] });
  assert.deepEqual(parseSkillInstallationCommandInput({ installationId }), { installationId });

  const candidate = {
    sourceId,
    packageId: skillId,
    resolvedRevision: '2'.repeat(40),
    artifactDigest: null,
    canonicalWebUrl: 'https://github.com/example/skills/commit/2222222',
    checkedAt: 50,
  };
  assert.deepEqual(parseSkillApplyUpdateInput({ candidate }), { candidate });
  assert.equal(parseSkillScanDepth(32), 32);
  assert.equal(parseSkillTargetKind('generic-agent-skills'), 'generic-agent-skills');
  assert.throws(
    () => parseSkillDistributionInput({ skillId, targetIds: [firstTargetId, firstTargetId] }),
    SkillOperationError,
  );
});
