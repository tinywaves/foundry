import type Database from 'better-sqlite3';
import type {
  SkillDirectoryProvider,
  SkillSourceCheckStatus,
  SkillSourceProvider,
  SkillSourceTrackingMode,
  SkillSourceView,
  SkillUpdateCandidateView,
} from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import {
  parseSkillArtifactDigest,
  parseSkillCanonicalWebUrl,
  parseSkillContentFingerprint,
  parseSkillDirectoryProvider,
  parseSkillId,
  parseSkillRemoteLocator,
  parseSkillRemoteRef,
  parseSkillRemoteRevision,
  parseSkillRelativePath,
  parseSkillSourceCheckStatus,
  parseSkillSourceId,
  parseSkillSourceProvider,
  parseSkillSourceTrackingMode,
  parseSkillSourceUrl,
  parseSkillUpdateCandidateId,
} from './skill-validation';

interface SkillSourceRow {
  id: string;
  package_id: string;
  provider: string;
  tracking_mode: string;
  source_native_id: string;
  directory_provider: string | null;
  catalog_locator: string | null;
  source_url: string | null;
  skill_path: string | null;
  requested_ref: string | null;
  resolved_revision: string;
  artifact_digest: string | null;
  observed_content_fingerprint: string;
  canonical_web_url: string;
  fetched_at: number;
  check_status: string;
  last_checked_at: number | null;
  created_at: number;
  updated_at: number;
}

interface SkillUpdateCandidateRow {
  id: string;
  source_id: string;
  package_id: string;
  resolved_revision: string;
  artifact_digest: string | null;
  canonical_web_url: string;
  checked_at: number;
}

export interface AttachSkillSourceInput {
  id: string;
  packageId: string;
  provider: SkillSourceProvider;
  trackingMode: SkillSourceTrackingMode;
  sourceNativeId: string;
  directoryProvider: SkillDirectoryProvider | null;
  catalogLocator: string | null;
  sourceUrl: string | null;
  skillPath: string | null;
  requestedRef: string | null;
  resolvedRevision: string;
  artifactDigest: string | null;
  observedContentFingerprint: string;
  canonicalWebUrl: string;
  fetchedAt: number;
  checkedAt: number | null;
}

export interface RecordSkillUpdateCandidateInput {
  id: string;
  sourceId: string;
  resolvedRevision: string;
  artifactDigest: string | null;
  canonicalWebUrl: string;
  checkedAt: number;
}

export interface ApplySkillUpdateCandidateInput {
  candidateId: string;
  resolvedRevision: string;
  artifactDigest: string | null;
  observedContentFingerprint: string;
  canonicalWebUrl: string;
  fetchedAt: number;
}

interface ParsedSourceInput extends AttachSkillSourceInput {
  sourceIdentityKey: string;
  skillPathKey: string;
  requestedRefKey: string;
}

const sourceColumns = `
  source.id,
  source.package_id,
  source.provider,
  source.tracking_mode,
  source.source_native_id,
  source.directory_provider,
  source.catalog_locator,
  source.source_url,
  source.skill_path,
  source.requested_ref,
  source.resolved_revision,
  source.artifact_digest,
  source.observed_content_fingerprint,
  source.canonical_web_url,
  source.fetched_at,
  source.check_status,
  source.last_checked_at,
  source.created_at,
  source.updated_at
`;

export class SkillSourceRepository {
  constructor(private readonly database: Database.Database) {}

  private execute<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw toSkillOperationError(error);
    }
  }

  attachOrRefresh(input: AttachSkillSourceInput): SkillSourceView {
    return this.execute(() => {
      const parsed = parseSourceInput(input);
      return this.database.transaction(() => {
        requireActivePackage(this.database, parsed.packageId);
        const existing = selectByIdentity(this.database, parsed);
        if (existing && existing.package_id !== parsed.packageId) {
          throw new SkillOperationError(
            'conflict',
            'This Skill Source already belongs to another Skill Package.',
          );
        }
        const sourceId = existing?.id ?? parsed.id;
        const checkStatus = parsed.checkedAt === null ? 'never' : 'current';
        if (existing) {
          this.database.prepare(`
            UPDATE skill_sources
            SET tracking_mode = @trackingMode,
                source_native_id = @sourceNativeId,
                directory_provider = @directoryProvider,
                catalog_locator = @catalogLocator,
                source_url = @sourceUrl,
                skill_path = @skillPath,
                requested_ref = @requestedRef,
                resolved_revision = @resolvedRevision,
                artifact_digest = @artifactDigest,
                observed_content_fingerprint = @observedContentFingerprint,
                canonical_web_url = @canonicalWebUrl,
                fetched_at = @fetchedAt,
                check_status = @checkStatus,
                last_checked_at = @checkedAt,
                updated_at = MAX(updated_at, @fetchedAt)
            WHERE id = @sourceId
          `).run({ ...parsed, sourceId, checkStatus });
        } else {
          this.database.prepare(`
            INSERT INTO skill_sources (
              id,
              package_id,
              provider,
              tracking_mode,
              source_native_id,
              source_identity_key,
              directory_provider,
              catalog_locator,
              source_url,
              skill_path,
              skill_path_key,
              requested_ref,
              requested_ref_key,
              resolved_revision,
              artifact_digest,
              observed_content_fingerprint,
              canonical_web_url,
              fetched_at,
              check_status,
              last_checked_at,
              created_at,
              updated_at
            ) VALUES (
              @id,
              @packageId,
              @provider,
              @trackingMode,
              @sourceNativeId,
              @sourceIdentityKey,
              @directoryProvider,
              @catalogLocator,
              @sourceUrl,
              @skillPath,
              @skillPathKey,
              @requestedRef,
              @requestedRefKey,
              @resolvedRevision,
              @artifactDigest,
              @observedContentFingerprint,
              @canonicalWebUrl,
              @fetchedAt,
              @checkStatus,
              @checkedAt,
              @fetchedAt,
              @fetchedAt
            )
          `).run({ ...parsed, checkStatus });
        }
        this.database.prepare('DELETE FROM skill_update_candidates WHERE source_id = ?')
          .run(sourceId);
        return getSourceInternal(this.database, sourceId);
      }).immediate();
    });
  }

  getSource(sourceIdValue: unknown): SkillSourceView {
    return this.execute(() => getSourceInternal(
      this.database,
      parseSkillSourceId(sourceIdValue),
    ));
  }

  listSources(packageIdValue: unknown): SkillSourceView[] {
    return this.execute(() => {
      const packageId = parseSkillId(packageIdValue);
      requireActivePackage(this.database, packageId);
      return this.database.prepare<[string], SkillSourceRow>(`
        SELECT ${sourceColumns}
        FROM skill_sources source
        WHERE source.package_id = ?
        ORDER BY source.created_at, source.id
      `).all(packageId).map((row) => mapSource(this.database, row));
    });
  }

  recordCurrent(sourceIdValue: unknown, checkedAtValue: unknown): SkillSourceView {
    return this.execute(() => {
      const sourceId = parseSkillSourceId(sourceIdValue);
      const checkedAt = parseTimestamp(checkedAtValue, 'Skill Source check time is invalid.');
      return this.database.transaction(() => {
        getSourceInternal(this.database, sourceId);
        this.database.prepare(`
          UPDATE skill_sources
          SET check_status = 'current',
              last_checked_at = @checkedAt,
              updated_at = MAX(updated_at, @checkedAt)
          WHERE id = @sourceId
        `).run({ sourceId, checkedAt });
        this.database.prepare('DELETE FROM skill_update_candidates WHERE source_id = ?')
          .run(sourceId);
        return getSourceInternal(this.database, sourceId);
      }).immediate();
    });
  }

  recordUnavailable(sourceIdValue: unknown, checkedAtValue: unknown): SkillSourceView {
    return this.execute(() => {
      const sourceId = parseSkillSourceId(sourceIdValue);
      const checkedAt = parseTimestamp(checkedAtValue, 'Skill Source check time is invalid.');
      getSourceInternal(this.database, sourceId);
      this.database.prepare(`
        UPDATE skill_sources
        SET check_status = 'unavailable',
            last_checked_at = @checkedAt,
            updated_at = MAX(updated_at, @checkedAt)
        WHERE id = @sourceId
      `).run({ sourceId, checkedAt });
      return getSourceInternal(this.database, sourceId);
    });
  }

  recordUpdateCandidate(input: RecordSkillUpdateCandidateInput): SkillSourceView {
    return this.execute(() => {
      const id = parseSkillUpdateCandidateId(input.id);
      const sourceId = parseSkillSourceId(input.sourceId);
      const resolvedRevision = parseSkillRemoteRevision(input.resolvedRevision);
      const artifactDigest = parseSkillArtifactDigest(input.artifactDigest);
      const canonicalWebUrl = parseSkillCanonicalWebUrl(input.canonicalWebUrl);
      const checkedAt = parseTimestamp(input.checkedAt, 'Skill Source check time is invalid.');
      return this.database.transaction(() => {
        const source = getSourceInternal(this.database, sourceId);
        if (source.trackingMode !== 'tracked') {
          throw new SkillOperationError('conflict', 'Fixed Skill Sources do not track updates.');
        }
        if (source.resolvedRevision === resolvedRevision) {
          throw new SkillOperationError('conflict', 'The Skill Source is already current.');
        }
        this.database.prepare('DELETE FROM skill_update_candidates WHERE source_id = ?')
          .run(sourceId);
        this.database.prepare(`
          INSERT INTO skill_update_candidates (
            id,
            source_id,
            package_id,
            resolved_revision,
            artifact_digest,
            canonical_web_url,
            checked_at,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          sourceId,
          source.packageId,
          resolvedRevision,
          artifactDigest,
          canonicalWebUrl,
          checkedAt,
          checkedAt,
        );
        this.database.prepare(`
          UPDATE skill_sources
          SET check_status = 'update-available',
              last_checked_at = @checkedAt,
              updated_at = MAX(updated_at, @checkedAt)
          WHERE id = @sourceId
        `).run({ sourceId, checkedAt });
        return getSourceInternal(this.database, sourceId);
      }).immediate();
    });
  }

  getActiveCandidate(candidateIdValue: unknown): SkillUpdateCandidateView {
    return this.execute(() => {
      const candidateId = parseSkillUpdateCandidateId(candidateIdValue);
      const row = this.database.prepare<[string], SkillUpdateCandidateRow>(`
        SELECT
          candidate.id,
          candidate.source_id,
          candidate.package_id,
          candidate.resolved_revision,
          candidate.artifact_digest,
          candidate.canonical_web_url,
          candidate.checked_at
        FROM skill_update_candidates candidate
        JOIN skill_sources source ON source.id = candidate.source_id
        JOIN skill_packages package ON package.id = candidate.package_id
        WHERE candidate.id = ?
          AND source.check_status = 'update-available'
          AND package.trashed_at IS NULL
          AND package.removed_at IS NULL
      `).get(candidateId);
      if (!row) {
        throw new SkillOperationError('not-found', 'Update Candidate was not found.');
      }
      return mapCandidate(row);
    });
  }

  markCandidateApplied(input: ApplySkillUpdateCandidateInput): SkillSourceView {
    return this.execute(() => {
      const candidateId = parseSkillUpdateCandidateId(input.candidateId);
      const resolvedRevision = parseSkillRemoteRevision(input.resolvedRevision);
      const artifactDigest = parseSkillArtifactDigest(input.artifactDigest);
      const observedContentFingerprint = parseSkillContentFingerprint(
        input.observedContentFingerprint,
      );
      const canonicalWebUrl = parseSkillCanonicalWebUrl(input.canonicalWebUrl);
      const fetchedAt = parseTimestamp(input.fetchedAt, 'Skill Source fetch time is invalid.');
      return this.database.transaction(() => {
        const candidate = this.getActiveCandidate(candidateId);
        if (
          candidate.resolvedRevision !== resolvedRevision
          || candidate.artifactDigest !== artifactDigest
        ) {
          throw new SkillOperationError('stale-result', 'The Update Candidate changed.');
        }
        this.database.prepare(`
          UPDATE skill_sources
          SET resolved_revision = @resolvedRevision,
              artifact_digest = @artifactDigest,
              observed_content_fingerprint = @observedContentFingerprint,
              canonical_web_url = @canonicalWebUrl,
              fetched_at = @fetchedAt,
              check_status = 'current',
              last_checked_at = @fetchedAt,
              updated_at = MAX(updated_at, @fetchedAt)
          WHERE id = @sourceId
        `).run({
          sourceId: candidate.sourceId,
          resolvedRevision,
          artifactDigest,
          observedContentFingerprint,
          canonicalWebUrl,
          fetchedAt,
        });
        this.database.prepare('DELETE FROM skill_update_candidates WHERE id = ?')
          .run(candidateId);
        return getSourceInternal(this.database, candidate.sourceId);
      }).immediate();
    });
  }
}

function selectByIdentity(
  database: Database.Database,
  input: ParsedSourceInput,
): SkillSourceRow | undefined {
  return database.prepare<[string, string, string, string], SkillSourceRow>(`
    SELECT ${sourceColumns}
    FROM skill_sources source
    WHERE source.provider = ?
      AND source.source_identity_key = ?
      AND source.skill_path_key = ?
      AND source.requested_ref_key = ?
  `).get(
    input.provider,
    input.sourceIdentityKey,
    input.skillPathKey,
    input.requestedRefKey,
  );
}

function getSourceInternal(database: Database.Database, sourceId: string): SkillSourceView {
  const row = database.prepare<[string], SkillSourceRow>(`
    SELECT ${sourceColumns}
    FROM skill_sources source
    JOIN skill_packages package ON package.id = source.package_id
    WHERE source.id = ?
      AND package.trashed_at IS NULL
      AND package.removed_at IS NULL
  `).get(sourceId);
  if (!row) {
    throw new SkillOperationError('not-found', 'Skill Source was not found.');
  }
  return mapSource(database, row);
}

function mapSource(database: Database.Database, row: SkillSourceRow): SkillSourceView {
  try {
    const id = parseSkillSourceId(row.id);
    const packageId = parseSkillId(row.package_id);
    const provider = parseSkillSourceProvider(row.provider);
    const trackingMode = parseSkillSourceTrackingMode(row.tracking_mode);
    const sourceNativeId = parseSkillRemoteLocator(row.source_native_id);
    const directoryProvider = parseSkillDirectoryProvider(row.directory_provider);
    const catalogLocator = row.catalog_locator === null
      ? null
      : parseSkillRemoteLocator(row.catalog_locator, 'catalogLocator');
    if ((directoryProvider === null) !== (catalogLocator === null)) {
      throw new Error('Invalid Skill Directory provenance.');
    }
    const sourceUrl = parseSkillSourceUrl(row.source_url);
    if (provider === 'git' && sourceUrl === null) {
      throw new Error('Missing Git source URL.');
    }
    const skillPath = row.skill_path === null ? null : parseSkillRelativePath(row.skill_path);
    const requestedRef = parseSkillRemoteRef(row.requested_ref);
    const resolvedRevision = parseSkillRemoteRevision(row.resolved_revision);
    const artifactDigest = parseSkillArtifactDigest(row.artifact_digest);
    const observedContentFingerprint = parseSkillContentFingerprint(
      row.observed_content_fingerprint,
    );
    const canonicalWebUrl = parseSkillCanonicalWebUrl(row.canonical_web_url);
    const fetchedAt = parseTimestamp(row.fetched_at, 'Stored Skill Source data is invalid.');
    const checkStatus = parseSkillSourceCheckStatus(row.check_status);
    const checkedAt = row.last_checked_at === null
      ? null
      : parseTimestamp(row.last_checked_at, 'Stored Skill Source data is invalid.');
    const createdAt = parseTimestamp(row.created_at, 'Stored Skill Source data is invalid.');
    const updatedAt = parseTimestamp(row.updated_at, 'Stored Skill Source data is invalid.');
    if (updatedAt < createdAt || (checkStatus === 'never') !== (checkedAt === null)) {
      throw new Error('Invalid Skill Source timestamps.');
    }
    const candidate = selectCandidateForSource(database, id);
    return {
      id,
      packageId,
      provider,
      trackingMode,
      sourceNativeId,
      directoryProvider,
      catalogLocator,
      sourceUrl,
      skillPath,
      requestedRef,
      resolvedRevision,
      artifactDigest,
      observedContentFingerprint,
      canonicalWebUrl,
      fetchedAt,
      check: mapSourceCheck(checkStatus, checkedAt, candidate),
      createdAt,
      updatedAt,
    };
  } catch (error) {
    if (error instanceof SkillOperationError && error.code === 'storage-corrupt') {
      throw error;
    }
    throw new SkillOperationError('storage-corrupt', 'Stored Skill Source data is invalid.');
  }
}

function selectCandidateForSource(
  database: Database.Database,
  sourceId: string,
): SkillUpdateCandidateView | null {
  const row = database.prepare<[string], SkillUpdateCandidateRow>(`
    SELECT
      id,
      source_id,
      package_id,
      resolved_revision,
      artifact_digest,
      canonical_web_url,
      checked_at
    FROM skill_update_candidates
    WHERE source_id = ?
  `).get(sourceId);
  return row ? mapCandidate(row) : null;
}

function parseSourceInput(input: AttachSkillSourceInput): ParsedSourceInput {
  const id = parseSkillSourceId(input.id);
  const packageId = parseSkillId(input.packageId);
  const provider = parseSkillSourceProvider(input.provider);
  const trackingMode = parseSkillSourceTrackingMode(input.trackingMode);
  const sourceNativeId = parseSkillRemoteLocator(input.sourceNativeId);
  const directoryProvider = parseSkillDirectoryProvider(input.directoryProvider);
  const catalogLocator = input.catalogLocator === null
    ? null
    : parseSkillRemoteLocator(input.catalogLocator, 'catalogLocator');
  if ((directoryProvider === null) !== (catalogLocator === null)) {
    throw new SkillOperationError(
      'invalid-input',
      'Skill Directory provenance is incomplete.',
    );
  }
  const sourceUrl = parseSkillSourceUrl(input.sourceUrl);
  if (provider === 'git' && sourceUrl === null) {
    throw new SkillOperationError('invalid-input', 'Git Sources require a remote URL.');
  }
  const skillPath = input.skillPath === null ? null : parseSkillRelativePath(input.skillPath);
  const requestedRef = parseSkillRemoteRef(input.requestedRef);
  const resolvedRevision = parseSkillRemoteRevision(input.resolvedRevision);
  const artifactDigest = parseSkillArtifactDigest(input.artifactDigest);
  const observedContentFingerprint = parseSkillContentFingerprint(
    input.observedContentFingerprint,
  );
  const canonicalWebUrl = parseSkillCanonicalWebUrl(input.canonicalWebUrl);
  const fetchedAt = parseTimestamp(input.fetchedAt, 'Skill Source fetch time is invalid.');
  const checkedAt = input.checkedAt === null
    ? null
    : parseTimestamp(input.checkedAt, 'Skill Source check time is invalid.');
  return {
    id,
    packageId,
    provider,
    trackingMode,
    sourceNativeId,
    directoryProvider,
    catalogLocator,
    sourceUrl,
    skillPath,
    requestedRef,
    resolvedRevision,
    artifactDigest,
    observedContentFingerprint,
    canonicalWebUrl,
    fetchedAt,
    checkedAt,
    sourceIdentityKey: normalizeSourceIdentity(provider, sourceNativeId),
    skillPathKey: skillPath?.normalize('NFC') ?? '',
    requestedRefKey: requestedRef?.normalize('NFC') ?? '',
  };
}

function normalizeSourceIdentity(provider: SkillSourceProvider, value: string): string {
  const normalized = value.normalize('NFC');
  return provider === 'clawhub' ? normalized.toLowerCase() : normalized;
}

function mapCandidate(row: SkillUpdateCandidateRow): SkillUpdateCandidateView {
  try {
    return {
      id: parseSkillUpdateCandidateId(row.id),
      sourceId: parseSkillSourceId(row.source_id),
      packageId: parseSkillId(row.package_id),
      resolvedRevision: parseSkillRemoteRevision(row.resolved_revision),
      artifactDigest: parseSkillArtifactDigest(row.artifact_digest),
      canonicalWebUrl: parseSkillCanonicalWebUrl(row.canonical_web_url),
      checkedAt: parseTimestamp(row.checked_at, 'Stored Update Candidate data is invalid.'),
    };
  } catch {
    throw new SkillOperationError('storage-corrupt', 'Stored Update Candidate data is invalid.');
  }
}

function mapSourceCheck(
  status: SkillSourceCheckStatus,
  checkedAt: number | null,
  candidate: SkillUpdateCandidateView | null,
): SkillSourceView['check'] {
  if (status === 'never') {
    return { status };
  }
  if (checkedAt === null) {
    throw new SkillOperationError('storage-corrupt', 'Stored Skill Source state is invalid.');
  }
  if (status === 'update-available') {
    if (candidate?.checkedAt !== checkedAt) {
      throw new SkillOperationError('storage-corrupt', 'Stored Update Candidate state is invalid.');
    }
    return { status, checkedAt, candidate };
  }
  return { status, checkedAt };
}

function requireActivePackage(database: Database.Database, packageId: string): void {
  const exists = database.prepare<[string], number>(`
    SELECT COUNT(*) FROM skill_packages
    WHERE id = ? AND trashed_at IS NULL AND removed_at IS NULL
  `).pluck().get(packageId) ?? 0;
  if (exists !== 1) {
    throw new SkillOperationError('not-found', 'Skill Package was not found.');
  }
}

function parseTimestamp(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new SkillOperationError('invalid-input', message);
  }
  return value;
}
