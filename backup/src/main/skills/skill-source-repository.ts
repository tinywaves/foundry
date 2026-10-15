import { Buffer } from 'node:buffer';
import type Database from 'better-sqlite3';
import type {
  SkillDirectoryProvider,
  SkillSourceProvider,
  SkillSourceTrackingMode,
  SkillSourceView,
} from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type { SkillPackageMetadata } from './skill-metadata-repository';
import { SKILL_PACKAGE_CONTENT_FORMAT } from './skill-package-codec';
import {
  normalizeSkillDistributionName,
  parseSkillArtifactDigest,
  parseSkillCanonicalWebUrl,
  parseSkillContentFingerprint,
  parseSkillDirectoryProvider,
  parseSkillDistributionName,
  parseSkillId,
  parseSkillRemoteLocator,
  parseSkillRemoteRef,
  parseSkillRemoteRevision,
  parseSkillRelativePath,
  parseSkillSourceId,
  parseSkillSourceProvider,
  parseSkillSourceTrackingMode,
  parseSkillSourceUrl,
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
  created_at: number;
  updated_at: number;
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
  checkedAt?: number | null;
}

export interface CommitRemoteSkillUpdateInput {
  sourceId: string;
  distributionName: string;
  description?: string | null;
  content: Uint8Array;
  fingerprint: string;
  resolvedRevision: string;
  artifactDigest: string | null;
  canonicalWebUrl: string;
  fetchedAt: number;
}

export interface ImportRemoteSkillPackageInput {
  packageId: string;
  distributionName: string;
  description?: string | null;
  content: Uint8Array;
  fingerprint: string;
  createdAt: number;
  source: Omit<AttachSkillSourceInput, 'packageId'>;
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
  source.created_at,
  source.updated_at
`;

export class SkillSourceRepository {
  constructor(private readonly database: Database.Database) {}

  attachOrRefresh(input: AttachSkillSourceInput): SkillSourceView {
    return this.execute(() => {
      const parsed = parseSourceInput(input);
      return this.database.transaction(() => this.attachOrRefreshInternal(parsed)).immediate();
    });
  }

  importPackageWithSource(input: ImportRemoteSkillPackageInput): {
    skillPackage: SkillPackageMetadata;
    source: SkillSourceView;
    reusedPackage: boolean;
  } {
    return this.execute(() => {
      const requestedPackageId = parseSkillId(input.packageId);
      const distributionName = parseSkillDistributionName(input.distributionName);
      const fingerprint = parseSkillContentFingerprint(input.fingerprint);
      const content = Buffer.from(input.content);
      if (content.length === 0) {
        throw new SkillOperationError('invalid-input', 'Skill Package content is empty.');
      }
      const createdAt = parseTimestamp(input.createdAt);
      return this.database.transaction(() => {
        const existingPackage = this.database.prepare<[string], {
          id: string;
          distribution_name: string;
          description: string | null;
          content_fingerprint: string;
          created_at: number;
          updated_at: number;
        }>(`
          SELECT id, distribution_name, description, content_fingerprint, created_at, updated_at
          FROM skill_packages
          WHERE content_fingerprint = ? AND trashed_at IS NULL AND removed_at IS NULL
          ORDER BY created_at, id
          LIMIT 1
        `).get(fingerprint);
        const packageId = existingPackage?.id ?? requestedPackageId;
        if (!existingPackage) {
          this.database.prepare(`
            INSERT INTO skill_packages (
              id,
              distribution_name,
              description,
              normalized_distribution_name,
              content_format,
              content_fingerprint,
              content_blob,
              created_at,
              updated_at
            ) VALUES (
              @packageId,
              @distributionName,
              @description,
              @normalizedDistributionName,
              '${SKILL_PACKAGE_CONTENT_FORMAT}',
              @fingerprint,
              @content,
              @createdAt,
              @createdAt
            )
          `).run({
            packageId,
            distributionName,
            description: parsePackageDescription(input.description),
            normalizedDistributionName: normalizeSkillDistributionName(distributionName),
            fingerprint,
            content,
            createdAt,
          });
        }
        const source = this.attachOrRefreshInternal(parseSourceInput({
          ...input.source,
          packageId,
        }));
        const packageRow = existingPackage ?? {
          id: packageId,
          distribution_name: distributionName,
          content_fingerprint: fingerprint,
          description: parsePackageDescription(input.description),
          created_at: createdAt,
          updated_at: createdAt,
        };
        return {
          skillPackage: mapPackageMetadata(packageRow),
          source,
          reusedPackage: existingPackage !== undefined,
        };
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
      `).all(packageId).map((row) => mapSource(row));
    });
  }

  commitRemoteUpdate(input: CommitRemoteSkillUpdateInput): {
    source: SkillSourceView;
    skillPackage: SkillPackageMetadata;
  } {
    return this.execute(() => {
      const sourceId = parseSkillSourceId(input.sourceId);
      const distributionName = parseSkillDistributionName(input.distributionName);
      const content = Buffer.from(input.content);
      if (content.length === 0) {
        throw new SkillOperationError('invalid-input', 'Skill Package content is empty.');
      }
      const fingerprint = parseSkillContentFingerprint(input.fingerprint);
      const resolvedRevision = parseSkillRemoteRevision(input.resolvedRevision);
      const artifactDigest = parseSkillArtifactDigest(input.artifactDigest);
      const canonicalWebUrl = parseSkillCanonicalWebUrl(input.canonicalWebUrl);
      const fetchedAt = parseTimestamp(input.fetchedAt);
      return this.database.transaction(() => {
        const source = getSourceInternal(this.database, sourceId);
        const packageResult = this.database.prepare(`
          UPDATE skill_packages
          SET distribution_name = @distributionName,
              normalized_distribution_name = @normalizedDistributionName,
              description = @description,
              content_format = '${SKILL_PACKAGE_CONTENT_FORMAT}',
              content_fingerprint = @fingerprint,
              content_blob = @content,
              updated_at = MAX(updated_at, @fetchedAt)
          WHERE id = @packageId AND trashed_at IS NULL AND removed_at IS NULL
        `).run({
          packageId: source.packageId,
          distributionName,
          normalizedDistributionName: normalizeSkillDistributionName(distributionName),
          description: parsePackageDescription(input.description),
          fingerprint,
          content,
          fetchedAt,
        });
        if (packageResult.changes !== 1) {
          throw new SkillOperationError('not-found', 'Skill Package was not found.');
        }
        this.database.prepare(`
          UPDATE skill_sources
          SET resolved_revision = @resolvedRevision,
              artifact_digest = @artifactDigest,
              observed_content_fingerprint = @fingerprint,
              canonical_web_url = @canonicalWebUrl,
              fetched_at = @fetchedAt,
              updated_at = MAX(updated_at, @fetchedAt)
          WHERE id = @sourceId
        `).run({
          sourceId,
          resolvedRevision,
          artifactDigest,
          fingerprint,
          canonicalWebUrl,
          fetchedAt,
        });
        const packageRow = this.database.prepare<[string], {
          id: string;
          distribution_name: string;
          content_fingerprint: string;
          description: string | null;
          created_at: number;
          updated_at: number;
        }>(`
          SELECT id, distribution_name, description, content_fingerprint, created_at, updated_at
          FROM skill_packages WHERE id = ?
        `).get(source.packageId);
        if (!packageRow) {
          throw new SkillOperationError('storage-corrupt', 'Stored Skill Package is missing.');
        }
        return {
          source: getSourceInternal(this.database, sourceId),
          skillPackage: {
            id: parseSkillId(packageRow.id),
            distributionName: parseSkillDistributionName(packageRow.distribution_name),
            description: parsePackageDescription(packageRow.description),
            fingerprint: parseSkillContentFingerprint(packageRow.content_fingerprint),
            createdAt: parseTimestamp(packageRow.created_at),
            updatedAt: parseTimestamp(packageRow.updated_at),
          },
        };
      }).immediate();
    });
  }

  // eslint-disable-next-line unicorn/consistent-class-member-order
  private execute<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw toSkillOperationError(error);
    }
  }

  private attachOrRefreshInternal(parsed: ParsedSourceInput): SkillSourceView {
    requireActivePackage(this.database, parsed.packageId);
    const existing = selectByIdentity(this.database, parsed);
    if (existing && existing.package_id !== parsed.packageId) {
      throw new SkillOperationError(
        'conflict',
        'This Skill Source already belongs to another Skill Package.',
      );
    }
    const sourceId = existing?.id ?? parsed.id;
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
            updated_at = MAX(updated_at, @fetchedAt)
        WHERE id = @sourceId
      `).run({ ...parsed, sourceId });
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
          @fetchedAt,
          @fetchedAt
        )
      `).run(parsed);
    }
    return getSourceInternal(this.database, sourceId);
  }
}

function mapPackageMetadata(row: {
  id: string;
  distribution_name: string;
  description: string | null;
  content_fingerprint: string;
  created_at: number;
  updated_at: number;
}): SkillPackageMetadata {
  return {
    id: parseSkillId(row.id),
    distributionName: parseSkillDistributionName(row.distribution_name),
    description: parsePackageDescription(row.description),
    fingerprint: parseSkillContentFingerprint(row.content_fingerprint),
    createdAt: parseTimestamp(row.created_at),
    updatedAt: parseTimestamp(row.updated_at),
  };
}

function parsePackageDescription(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new SkillOperationError('storage-corrupt', 'Stored Skill Package description is invalid.');
  }
  const description = value.trim();
  return description.length > 0 ? description : null;
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
  return mapSource(row);
}

function mapSource(row: SkillSourceRow): SkillSourceView {
  try {
    const provider = parseSkillSourceProvider(row.provider);
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
    const createdAt = parseTimestamp(row.created_at);
    const updatedAt = parseTimestamp(row.updated_at);
    if (updatedAt < createdAt) {
      throw new Error('Invalid Skill Source timestamps.');
    }
    return {
      id: parseSkillSourceId(row.id),
      packageId: parseSkillId(row.package_id),
      provider,
      trackingMode: parseSkillSourceTrackingMode(row.tracking_mode),
      sourceNativeId: parseSkillRemoteLocator(row.source_native_id),
      directoryProvider,
      catalogLocator,
      sourceUrl,
      skillPath: row.skill_path === null ? null : parseSkillRelativePath(row.skill_path),
      requestedRef: parseSkillRemoteRef(row.requested_ref),
      resolvedRevision: parseSkillRemoteRevision(row.resolved_revision),
      artifactDigest: parseSkillArtifactDigest(row.artifact_digest),
      observedContentFingerprint: parseSkillContentFingerprint(
        row.observed_content_fingerprint,
      ),
      canonicalWebUrl: parseSkillCanonicalWebUrl(row.canonical_web_url),
      fetchedAt: parseTimestamp(row.fetched_at),
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

function parseSourceInput(input: AttachSkillSourceInput): ParsedSourceInput {
  const provider = parseSkillSourceProvider(input.provider);
  const sourceNativeId = parseSkillRemoteLocator(input.sourceNativeId);
  const directoryProvider = parseSkillDirectoryProvider(input.directoryProvider);
  const catalogLocator = input.catalogLocator === null
    ? null
    : parseSkillRemoteLocator(input.catalogLocator, 'catalogLocator');
  if ((directoryProvider === null) !== (catalogLocator === null)) {
    throw new SkillOperationError('invalid-input', 'Skill Directory provenance is incomplete.');
  }
  const sourceUrl = parseSkillSourceUrl(input.sourceUrl);
  if (provider === 'git' && sourceUrl === null) {
    throw new SkillOperationError('invalid-input', 'Git Sources require a remote URL.');
  }
  const skillPath = input.skillPath === null ? null : parseSkillRelativePath(input.skillPath);
  const requestedRef = parseSkillRemoteRef(input.requestedRef);
  const fetchedAt = parseTimestamp(input.fetchedAt);
  return {
    ...input,
    id: parseSkillSourceId(input.id),
    packageId: parseSkillId(input.packageId),
    provider,
    trackingMode: parseSkillSourceTrackingMode(input.trackingMode),
    sourceNativeId,
    directoryProvider,
    catalogLocator,
    sourceUrl,
    skillPath,
    requestedRef,
    resolvedRevision: parseSkillRemoteRevision(input.resolvedRevision),
    artifactDigest: parseSkillArtifactDigest(input.artifactDigest),
    observedContentFingerprint: parseSkillContentFingerprint(
      input.observedContentFingerprint,
    ),
    canonicalWebUrl: parseSkillCanonicalWebUrl(input.canonicalWebUrl),
    fetchedAt,
    sourceIdentityKey: normalizeSourceIdentity(provider, sourceNativeId),
    skillPathKey: skillPath?.normalize('NFC') ?? '',
    requestedRefKey: requestedRef?.normalize('NFC') ?? '',
  };
}

function normalizeSourceIdentity(provider: SkillSourceProvider, value: string): string {
  const normalized = value.normalize('NFC');
  return provider === 'clawhub' ? normalized.toLowerCase() : normalized;
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

function parseTimestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new SkillOperationError('invalid-input', 'Skill Source timestamp is invalid.');
  }
  return value;
}
