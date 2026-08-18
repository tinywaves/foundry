import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SkillOperationError } from './skill-error';
import {
  normalizeSkillDistributionName,
  parseSkillContentFingerprint,
  parseSkillDistributionInput,
  parseSkillDistributionName,
  parseSkillDistributionRecordId,
  parseSkillFileTarget,
  parseSkillId,
  parseSkillInstallationCommandInput,
  parseSkillInstallationId,
  parseSkillCanonicalWebUrl,
  parseSkillDirectoryProvider,
  parseSkillDiscoveryProvider,
  parseSkillRemoteQuery,
  parseSkillRemoteRef,
  parseSkillRemoteRevision,
  parseSkillRelativePath,
  parseSkillRevisionId,
  parseSkillRevisionFileTarget,
  parseSkillScanDepth,
  parseSkillSourceId,
  parseSkillSourceProvider,
  parseSkillSourceTrackingMode,
  parseSkillSourceUrl,
  parseStoredSkillContentObservation,
  parseSkillTargetKind,
  parseSkillTargetId,
  parseSkillTargetPolicyInput,
  parseSkillWatchSessionId,
  parseSkillUpdateCandidateId,
} from './skill-validation';

test('parses a Skill ID and rejects malformed values without echoing them', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  assert.equal(parseSkillId(id), id);

  const secretValue = 'invalid-sensitive-id';
  assert.throws(() => parseSkillId(secretValue), (error: unknown) => {
    assert.ok(error instanceof SkillOperationError);
    assert.equal(error.code, 'invalid-input');
    assert.deepEqual(error.fields, [
      {
        field: 'skillId',
        message: 'Provide a valid Skill ID.',
      },
    ]);
    assert.equal(error.message.includes(secretValue), false);
    return true;
  });
});

test('validates every Skills identity with its domain field name', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const parsers = [
    ['revisionId', parseSkillRevisionId],
    ['targetId', parseSkillTargetId],
    ['installationId', parseSkillInstallationId],
    ['distributionRecordId', parseSkillDistributionRecordId],
    ['watchSessionId', parseSkillWatchSessionId],
    ['sourceId', parseSkillSourceId],
    ['candidateId', parseSkillUpdateCandidateId],
  ] as const;

  for (const [field, parser] of parsers) {
    assert.equal(parser(id), id);
    assert.throws(() => parser('invalid'), (error: unknown) => {
      assert.ok(error instanceof SkillOperationError);
      assert.equal(error.fields?.[0]?.field, field);
      return true;
    });
  }
});

test('validates remote providers, locators, refs, and credential-free URLs', () => {
  assert.equal(parseSkillSourceProvider('git'), 'git');
  assert.equal(parseSkillSourceProvider('clawhub'), 'clawhub');
  assert.equal(parseSkillDirectoryProvider('skills-sh'), 'skills-sh');
  assert.equal(parseSkillDiscoveryProvider('skills-sh'), 'skills-sh');
  assert.equal(parseSkillSourceTrackingMode('tracked'), 'tracked');
  assert.equal(parseSkillRemoteQuery('typescript'), 'typescript');
  assert.equal(parseSkillRemoteRevision('a'.repeat(40)), 'a'.repeat(40));
  assert.equal(parseSkillRemoteRef('refs/heads/main'), 'refs/heads/main');
  assert.equal(
    parseSkillSourceUrl('https://github.com/example/skills.git'),
    'https://github.com/example/skills.git',
  );
  assert.equal(
    parseSkillSourceUrl('git@github.com:example/skills.git'),
    'git@github.com:example/skills.git',
  );
  assert.equal(
    parseSkillCanonicalWebUrl('https://github.com/example/skills'),
    'https://github.com/example/skills',
  );

  for (const value of ['goose', 'skills-sh']) {
    assert.throws(() => parseSkillSourceProvider(value), SkillOperationError);
  }
  for (const value of ['-main', 'feature..branch', 'main@{1}', 'bad ref']) {
    assert.throws(() => parseSkillRemoteRef(value), SkillOperationError);
  }
  for (const value of [
    'http://github.example.invalid/example/skills.git', // eslint-disable-line unicorn/prefer-https
    'https://token@github.com/example/skills.git',
    'file:///tmp/skills',
  ]) {
    assert.throws(() => parseSkillSourceUrl(value), SkillOperationError);
  }
  assert.throws(
    () => parseSkillCanonicalWebUrl('ssh://git@github.com/example/skills.git'),
    SkillOperationError,
  );
});

test('preserves a safe Distribution Name and derives a stable collision key', () => {
  assert.equal(parseSkillDistributionName('My.Skill_1'), 'My.Skill_1');
  assert.equal(normalizeSkillDistributionName('My-Skill'), 'my-skill');
  assert.equal(normalizeSkillDistributionName('Cafe\u{301}'), 'caf\u{E9}');

  for (const value of ['', ' skill ', '.', '..', 'nested/skill', String.raw`nested\skill`]) {
    assert.throws(() => parseSkillDistributionName(value), (error: unknown) => {
      assert.ok(error instanceof SkillOperationError);
      assert.equal(error.fields?.[0]?.field, 'distributionName');
      return true;
    });
  }
});

test('rejects Distribution Names that cannot be used safely as local directory names', () => {
  const unsafeNames = [
    'CON',
    'con.txt',
    'name.',
    'bad:name',
    'bad\u{0}name',
    'a'.repeat(256),
  ];

  for (const value of unsafeNames) {
    assert.throws(() => parseSkillDistributionName(value), SkillOperationError);
  }
});

test('accepts only normalized relative package file paths', () => {
  assert.equal(parseSkillRelativePath('SKILL.md'), 'SKILL.md');
  assert.equal(parseSkillRelativePath('references/guide.md'), 'references/guide.md');

  const unsafePaths = [
    '',
    '.',
    '..',
    '/SKILL.md',
    String.raw`C:\SKILL.md`,
    'C:SKILL.md',
    String.raw`references\guide.md`,
    'references//guide.md',
    'references/../SKILL.md',
    './SKILL.md',
  ];
  for (const value of unsafePaths) {
    assert.throws(() => parseSkillRelativePath(value), SkillOperationError);
  }
});

test('validates fingerprints, scan depth, and target kinds', () => {
  const fingerprint = 'a'.repeat(64);
  assert.equal(parseSkillContentFingerprint(fingerprint), fingerprint);
  assert.equal(parseSkillScanDepth(1), 1);
  assert.equal(parseSkillScanDepth(32), 32);
  assert.equal(parseSkillTargetKind('generic-agent-skills'), 'generic-agent-skills');
  assert.equal(parseSkillTargetKind('codex-legacy'), 'codex-legacy');

  for (const value of ['A'.repeat(64), 'a'.repeat(63), 'not-a-fingerprint']) {
    assert.throws(() => parseSkillContentFingerprint(value), SkillOperationError);
  }
  for (const value of [0, 33, 1.5, '2']) {
    assert.throws(() => parseSkillScanDepth(value), SkillOperationError);
  }
  assert.throws(() => parseSkillTargetKind('goose'), SkillOperationError);
});

test('parses file, target-policy, and distribution command payloads', () => {
  const skillId = '00000000-0000-4000-8000-000000000001';
  const firstTargetId = '00000000-0000-4000-8000-000000000002';
  const secondTargetId = '00000000-0000-4000-8000-000000000003';
  const revisionId = '00000000-0000-4000-8000-000000000004';
  const installationId = '00000000-0000-4000-8000-000000000005';

  assert.deepEqual(parseSkillFileTarget({
    skillId,
    relativePath: 'references/guide.md',
  }), {
    skillId,
    relativePath: 'references/guide.md',
  });
  assert.deepEqual(parseSkillTargetPolicyInput({
    targetId: firstTargetId,
    enabled: true,
    maxScanDepth: 6,
    allowSymlinkEscape: false,
  }), {
    targetId: firstTargetId,
    enabled: true,
    maxScanDepth: 6,
    allowSymlinkEscape: false,
  });
  assert.deepEqual(parseSkillRevisionFileTarget({
    skillId,
    revisionId,
    relativePath: 'SKILL.md',
  }), {
    skillId,
    revisionId,
    relativePath: 'SKILL.md',
  });
  assert.deepEqual(parseSkillInstallationCommandInput({ installationId }), {
    installationId,
  });
  assert.deepEqual(parseSkillDistributionInput({
    skillId,
    targetIds: [firstTargetId, secondTargetId],
  }), {
    skillId,
    targetIds: [firstTargetId, secondTargetId],
  });

  assert.throws(() => parseSkillFileTarget({ skillId, relativePath: '../secret' }));
  assert.throws(() => parseSkillRevisionFileTarget({
    skillId,
    revisionId: 'invalid',
    relativePath: 'SKILL.md',
  }));
  assert.throws(() => parseSkillInstallationCommandInput({ installationId: 'invalid' }));
  assert.throws(() => parseSkillTargetPolicyInput({
    targetId: firstTargetId,
    enabled: 'yes',
    maxScanDepth: 6,
    allowSymlinkEscape: false,
  }));
  assert.throws(() => parseSkillDistributionInput({ skillId, targetIds: [] }));
  assert.throws(() => parseSkillDistributionInput({
    skillId,
    targetIds: [firstTargetId, firstTargetId],
  }));
});

test('decodes stored content observations and rejects impossible stored facts', () => {
  const fingerprint = 'a'.repeat(64);
  assert.deepEqual(parseStoredSkillContentObservation(
    'available',
    fingerprint,
    1_723_952_400_000,
  ), {
    status: 'available',
    fingerprint,
    observedAt: 1_723_952_400_000,
  });
  assert.deepEqual(parseStoredSkillContentObservation(
    'missing',
    null,
    1_723_952_400_000,
  ), {
    status: 'missing',
    observedAt: 1_723_952_400_000,
  });

  for (const values of [
    ['available', null, 1_723_952_400_000],
    ['missing', fingerprint, 1_723_952_400_000],
    ['unknown', null, 1_723_952_400_000],
    ['unreadable', null, -1],
  ] as const) {
    assert.throws(
      () => parseStoredSkillContentObservation(values[0], values[1], values[2]),
      (error: unknown) => {
        assert.ok(error instanceof SkillOperationError);
        assert.equal(error.code, 'storage-corrupt');
        return true;
      },
    );
  }
});
