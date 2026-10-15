import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import type Database from 'better-sqlite3';
import { test } from 'vitest';
import { openFoundryDatabase } from '../storage/foundry-database';
import { SkillOperationError } from './skill-error';
import { SKILL_PACKAGE_CONTENT_FORMAT } from './skill-package-codec';
import type { AttachSkillSourceInput } from './skill-source-repository';
import { SkillSourceRepository } from './skill-source-repository';

const packageId = '00000000-0000-4000-8000-000000000701';
const sourceId = '00000000-0000-4000-8000-000000000702';
const fingerprint = `v2:${'a'.repeat(64)}`;
const nextFingerprint = `v2:${'b'.repeat(64)}`;

function insertPackage(database: Database.Database): void {
  database.prepare(`
    INSERT INTO skill_packages (
      id, distribution_name, normalized_distribution_name, content_format,
      content_fingerprint, content_blob, created_at, updated_at
    ) VALUES (?, 'remote-skill', 'remote-skill', ?, ?, ?, 10, 10)
  `).run(packageId, SKILL_PACKAGE_CONTENT_FORMAT, fingerprint, Buffer.from('old-content'));
}

function gitSource(overrides: Partial<AttachSkillSourceInput> = {}): AttachSkillSourceInput {
  return {
    id: sourceId,
    packageId,
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
    observedContentFingerprint: fingerprint,
    canonicalWebUrl: 'https://github.com/example/skills/tree/main/skills/example',
    fetchedAt: 20,
    ...overrides,
  };
}

test('attaches and refreshes one stable Source identity without persisted check state', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database);
    const repository = new SkillSourceRepository(database);
    const created = repository.attachOrRefresh(gitSource());
    const refreshed = repository.attachOrRefresh(gitSource({
      id: '00000000-0000-4000-8000-000000000703',
      resolvedRevision: '2'.repeat(40),
      fetchedAt: 30,
    }));

    assert.equal(created.id, sourceId);
    assert.equal(refreshed.id, sourceId);
    assert.equal(refreshed.resolvedRevision, '2'.repeat(40));
    assert.equal(repository.listSources(packageId).length, 1);
    const columns = database.prepare('PRAGMA table_info(skill_sources)').all() as Array<{ name: string }>;
    assert.equal(columns.some((column) => column.name === 'check_status'), false);
  } finally {
    database.close();
  }
});

test('atomically replaces Package content and current Source facts', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database);
    const repository = new SkillSourceRepository(database);
    repository.attachOrRefresh(gitSource());
    const committed = repository.commitRemoteUpdate({
      sourceId,
      distributionName: 'renamed-skill',
      content: Buffer.from('new-content'),
      fingerprint: nextFingerprint,
      resolvedRevision: '2'.repeat(40),
      artifactDigest: 'c'.repeat(64),
      canonicalWebUrl: 'https://github.com/example/skills/commit/2222222',
      fetchedAt: 30,
    });

    assert.equal(committed.skillPackage.fingerprint, nextFingerprint);
    assert.equal(committed.source.observedContentFingerprint, nextFingerprint);
    assert.equal(committed.source.resolvedRevision, '2'.repeat(40));
    assert.deepEqual(
      database.prepare<[string], Buffer>(`SELECT content_blob FROM skill_packages WHERE id = ?`)
        .pluck().get(packageId),
      Buffer.from('new-content'),
    );
  } finally {
    database.close();
  }
});

test('maps malformed stored Source metadata to storage-corrupt', () => {
  const database = openFoundryDatabase(':memory:');
  try {
    insertPackage(database);
    const repository = new SkillSourceRepository(database);
    repository.attachOrRefresh(gitSource());
    database.pragma('ignore_check_constraints = ON');
    database.prepare(`UPDATE skill_sources SET canonical_web_url = 'file:///private' WHERE id = ?`)
      .run(sourceId);
    assert.throws(
      () => repository.getSource(sourceId),
      (error: unknown) => error instanceof SkillOperationError && error.code === 'storage-corrupt',
    );
  } finally {
    database.close();
  }
});
