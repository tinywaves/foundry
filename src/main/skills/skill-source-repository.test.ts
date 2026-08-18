import assert from 'node:assert/strict';
import type Database from 'better-sqlite3';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import type { SkillApiErrorCode } from '../../shared/skill-contract';
import type { AttachSkillSourceInput } from './skill-source-repository';
import { SkillSourceRepository } from './skill-source-repository';
import { SkillOperationError } from './skill-error';

const firstPackageId = '00000000-0000-4000-8000-000000000701';
const secondPackageId = '00000000-0000-4000-8000-000000000702';
const firstSourceId = '00000000-0000-4000-8000-000000000703';
const secondSourceId = '00000000-0000-4000-8000-000000000704';
const candidateId = '00000000-0000-4000-8000-000000000705';
const secondCandidateId = '00000000-0000-4000-8000-000000000706';
const firstFingerprint = 'a'.repeat(64);
const secondFingerprint = 'b'.repeat(64);

function insertPackage(database: Database.Database, id: string, fingerprint: string): void {
  database.prepare(`
    INSERT INTO skill_packages (
      id, distribution_name, normalized_distribution_name,
      store_observation, store_fingerprint, store_observed_at, created_at, updated_at
    ) VALUES (?, 'Remote Skill', 'remote skill', 'available', ?, 10, 10, 10)
  `).run(id, fingerprint);
}

function gitSource(overrides: Partial<AttachSkillSourceInput> = {}): AttachSkillSourceInput {
  return {
    id: firstSourceId,
    packageId: firstPackageId,
    provider: 'git',
    trackingMode: 'tracked',
    sourceNativeId: 'https://github.com/example/skills.git',
    directoryProvider: null,
    catalogLocator: null,
    sourceUrl: 'https://github.com/example/skills.git',
    skillPath: 'skills/example',
    requestedRef: 'main',
    resolvedRevision: '1'.repeat(40),
    artifactDigest: null,
    observedContentFingerprint: firstFingerprint,
    canonicalWebUrl: 'https://github.com/example/skills/tree/main/skills/example',
    fetchedAt: 20,
    checkedAt: null,
    ...overrides,
  };
}

function assertSkillError(operation: () => unknown, code: SkillApiErrorCode): void {
  assert.throws(operation, (error: unknown) => (
    error instanceof SkillOperationError && error.code === code
  ));
}

test('attaches provider-neutral provenance and refreshes one stable source identity', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database, firstPackageId, firstFingerprint);
    const repository = new SkillSourceRepository(database);
    const created = repository.attachOrRefresh(gitSource());
    assert.deepEqual(created.check, { status: 'never' });
    assert.equal(created.provider, 'git');
    assert.equal(created.sourceUrl, 'https://github.com/example/skills.git');
    assert.equal(created.skillPath, 'skills/example');

    const refreshed = repository.attachOrRefresh(gitSource({
      id: secondSourceId,
      resolvedRevision: '2'.repeat(40),
      observedContentFingerprint: secondFingerprint,
      fetchedAt: 30,
      checkedAt: 30,
    }));
    assert.equal(refreshed.id, firstSourceId);
    assert.equal(refreshed.resolvedRevision, '2'.repeat(40));
    assert.deepEqual(refreshed.check, { status: 'current', checkedAt: 30 });
    assert.equal(repository.listSources(firstPackageId).length, 1);
  } finally {
    database.close();
  }
});

test('keeps a source identity bound to one Foundry Skill Package', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database, firstPackageId, firstFingerprint);
    insertPackage(database, secondPackageId, secondFingerprint);
    const repository = new SkillSourceRepository(database);
    repository.attachOrRefresh(gitSource());
    assertSkillError(() => repository.attachOrRefresh(gitSource({
      id: secondSourceId,
      packageId: secondPackageId,
      observedContentFingerprint: secondFingerprint,
    })), 'conflict');
    assert.equal(repository.listSources(firstPackageId).length, 1);
    assert.equal(repository.listSources(secondPackageId).length, 0);
  } finally {
    database.close();
  }
});

test('records candidates separately and only applies the matching immutable revision', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database, firstPackageId, firstFingerprint);
    const repository = new SkillSourceRepository(database);
    repository.attachOrRefresh(gitSource());
    const withCandidate = repository.recordUpdateCandidate({
      id: candidateId,
      sourceId: firstSourceId,
      resolvedRevision: '2'.repeat(40),
      artifactDigest: secondFingerprint,
      canonicalWebUrl: 'https://github.com/example/skills/commit/2222222',
      checkedAt: 30,
    });
    assert.equal(withCandidate.check.status, 'update-available');
    assert.equal(repository.getActiveCandidate(candidateId).resolvedRevision, '2'.repeat(40));

    repository.recordUnavailable(firstSourceId, 40);
    const unavailable = repository.getSource(firstSourceId);
    assert.deepEqual(unavailable.check, { status: 'unavailable', checkedAt: 40 });
    assert.equal(
      database.prepare('SELECT COUNT(*) FROM skill_update_candidates').pluck().get(),
      1,
    );
    assertSkillError(() => repository.getActiveCandidate(candidateId), 'not-found');

    repository.recordUpdateCandidate({
      id: secondCandidateId,
      sourceId: firstSourceId,
      resolvedRevision: '3'.repeat(40),
      artifactDigest: null,
      canonicalWebUrl: 'https://github.com/example/skills/commit/3333333',
      checkedAt: 50,
    });
    assertSkillError(() => repository.markCandidateApplied({
      candidateId: secondCandidateId,
      resolvedRevision: '4'.repeat(40),
      artifactDigest: null,
      observedContentFingerprint: secondFingerprint,
      canonicalWebUrl: 'https://github.com/example/skills/commit/4444444',
      fetchedAt: 60,
    }), 'stale-result');

    const applied = repository.markCandidateApplied({
      candidateId: secondCandidateId,
      resolvedRevision: '3'.repeat(40),
      artifactDigest: null,
      observedContentFingerprint: secondFingerprint,
      canonicalWebUrl: 'https://github.com/example/skills/commit/3333333',
      fetchedAt: 60,
    });
    assert.equal(applied.resolvedRevision, '3'.repeat(40));
    assert.equal(applied.observedContentFingerprint, secondFingerprint);
    assert.deepEqual(applied.check, { status: 'current', checkedAt: 60 });
    assert.equal(
      database.prepare('SELECT COUNT(*) FROM skill_update_candidates').pluck().get(),
      0,
    );
  } finally {
    database.close();
  }
});

test('rejects update candidates for fixed sources', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database, firstPackageId, firstFingerprint);
    const repository = new SkillSourceRepository(database);
    repository.attachOrRefresh(gitSource({ trackingMode: 'fixed', requestedRef: 'v1.0.0' }));
    assertSkillError(() => repository.recordUpdateCandidate({
      id: candidateId,
      sourceId: firstSourceId,
      resolvedRevision: '2'.repeat(40),
      artifactDigest: null,
      canonicalWebUrl: 'https://github.com/example/skills/releases/tag/v2.0.0',
      checkedAt: 30,
    }), 'conflict');
  } finally {
    database.close();
  }
});

test('maps malformed stored source metadata to a non-sensitive corruption error', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database, firstPackageId, firstFingerprint);
    const repository = new SkillSourceRepository(database);
    repository.attachOrRefresh(gitSource());
    database.pragma('ignore_check_constraints = ON');
    database.prepare(`
      UPDATE skill_sources SET canonical_web_url = 'file:///private/source' WHERE id = ?
    `).run(firstSourceId);
    assertSkillError(() => repository.getSource(firstSourceId), 'storage-corrupt');
  } finally {
    database.close();
  }
});
