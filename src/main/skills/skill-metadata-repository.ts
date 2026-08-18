import type Database from 'better-sqlite3';
import type {
  SkillContentFingerprint,
  SkillContentObservation,
  SkillRevisionReason,
} from '../../shared/skill-contract';
import { skillRevisionReasons } from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import {
  normalizeSkillDistributionName,
  parseSkillContentFingerprint,
  parseSkillDistributionName,
  parseSkillId,
  parseSkillRevisionId,
  parseStoredSkillContentObservation,
} from './skill-validation';

interface SkillPackageRow {
  id: string;
  distribution_name: string;
  store_observation: string;
  store_fingerprint: string | null;
  store_observed_at: number;
  created_at: number;
  updated_at: number;
}

interface SkillTrashPackageRow extends SkillPackageRow {
  trashed_at: number;
}

interface SkillRevisionRow {
  id: string;
  package_id: string;
  sequence_number: number;
  fingerprint: string;
  reason: string;
  created_at: number;
}

export interface SkillPackageMetadata {
  id: string;
  distributionName: string;
  storeObservation: SkillContentObservation;
  createdAt: number;
  updatedAt: number;
}

export interface SkillRevisionMetadata {
  id: string;
  packageId: string;
  sequenceNumber: number;
  fingerprint: SkillContentFingerprint;
  reason: SkillRevisionReason;
  createdAt: number;
}

export interface SkillTrashPackageMetadata extends SkillPackageMetadata {
  trashedAt: number;
}

export interface CreateImportedPackageInput {
  id: string;
  distributionName: string;
  fingerprint: string;
  revisionId: string;
  createdAt: number;
}

export interface ImportedPackageMetadata {
  package: SkillPackageMetadata;
  revision: SkillRevisionMetadata;
}

export interface CreateSkillRevisionInput {
  id: string;
  packageId: string;
  fingerprint: string;
  reason: SkillRevisionReason;
  createdAt: number;
}

export interface CommitSkillStorePromotionInput {
  packageId: string;
  observation: Extract<SkillContentObservation, { status: 'available' }>;
  revision: CreateSkillRevisionInput | SkillRevisionMetadata;
  createRevision: boolean;
}

export interface CommitSkillStorePromotionResult {
  package: SkillPackageMetadata;
  revision: SkillRevisionMetadata;
}

export class SkillMetadataRepository {
  constructor(private readonly database: Database.Database) {}

  private execute<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw toSkillOperationError(error);
    }
  }

  private getActivePackageInternal(id: string): SkillPackageMetadata {
    const row = this.selectActivePackage(id);
    if (!row) {
      throw new SkillOperationError('not-found', 'Skill Package was not found.');
    }
    return this.mapPackage(row);
  }

  private selectActivePackage(id: string): SkillPackageRow | undefined {
    return this.database.prepare<[string], SkillPackageRow>(`
      SELECT
        id,
        distribution_name,
        store_observation,
        store_fingerprint,
        store_observed_at,
        created_at,
        updated_at
      FROM skill_packages
      WHERE id = ? AND trashed_at IS NULL AND removed_at IS NULL
    `).get(id);
  }

  private selectTrashedPackage(id: string): SkillTrashPackageRow | undefined {
    return this.database.prepare<[string], SkillTrashPackageRow>(`
      SELECT
        id,
        distribution_name,
        store_observation,
        store_fingerprint,
        store_observed_at,
        created_at,
        updated_at,
        trashed_at
      FROM skill_packages
      WHERE id = ? AND trashed_at IS NOT NULL AND removed_at IS NULL
    `).get(id);
  }

  private getRevisionInternal(id: string): SkillRevisionMetadata {
    const row = this.selectRevision(id);
    if (!row) {
      throw new SkillOperationError('not-found', 'Skill Revision was not found.');
    }
    return this.mapRevision(row);
  }

  private selectRevision(id: string): SkillRevisionRow | undefined {
    return this.database.prepare<[string], SkillRevisionRow>(`
      SELECT id, package_id, sequence_number, fingerprint, reason, created_at
      FROM skill_revisions
      WHERE id = ?
    `).get(id);
  }

  private mapPackage(row: SkillPackageRow): SkillPackageMetadata {
    const id = parseStoredId(row.id, parseSkillId, 'Stored Skill Package data is invalid.');
    const distributionName = parseStoredDistributionName(row.distribution_name);
    const storeObservation = parseStoredSkillContentObservation(
      row.store_observation,
      row.store_fingerprint,
      row.store_observed_at,
    );
    const createdAt = parseStoredTimestamp(row.created_at, 'Stored Skill Package data is invalid.');
    const updatedAt = parseStoredTimestamp(row.updated_at, 'Stored Skill Package data is invalid.');
    if (updatedAt < createdAt) {
      throw new SkillOperationError('storage-corrupt', 'Stored Skill Package data is invalid.');
    }
    return { id, distributionName, storeObservation, createdAt, updatedAt };
  }

  private mapTrashPackage(row: SkillTrashPackageRow): SkillTrashPackageMetadata {
    return {
      ...this.mapPackage(row),
      trashedAt: parseStoredTimestamp(
        row.trashed_at,
        'Stored Skill Package data is invalid.',
      ),
    };
  }

  private mapRevision(row: SkillRevisionRow): SkillRevisionMetadata {
    const id = parseStoredId(row.id, parseSkillRevisionId, 'Stored Skill Revision data is invalid.');
    const packageId = parseStoredId(
      row.package_id,
      parseSkillId,
      'Stored Skill Revision data is invalid.',
    );
    const fingerprint = parseStoredFingerprint(row.fingerprint);
    const createdAt = parseStoredTimestamp(row.created_at, 'Stored Skill Revision data is invalid.');
    if (!Number.isSafeInteger(row.sequence_number) || row.sequence_number < 1) {
      throw new SkillOperationError('storage-corrupt', 'Stored Skill Revision data is invalid.');
    }
    if (!skillRevisionReasons.includes(row.reason as SkillRevisionReason)) {
      throw new SkillOperationError('storage-corrupt', 'Stored Skill Revision data is invalid.');
    }
    return {
      id,
      packageId,
      sequenceNumber: row.sequence_number,
      fingerprint,
      reason: row.reason as SkillRevisionReason,
      createdAt,
    };
  }

  createImportedPackage(input: CreateImportedPackageInput): ImportedPackageMetadata {
    return this.execute(() => {
      const id = parseSkillId(input.id);
      const revisionId = parseSkillRevisionId(input.revisionId);
      const distributionName = parseSkillDistributionName(input.distributionName);
      const fingerprint = parseSkillContentFingerprint(input.fingerprint);
      const createdAt = parseTimestamp(input.createdAt);

      return this.database.transaction(() => {
        this.database.prepare(`
          INSERT INTO skill_packages (
            id,
            distribution_name,
            normalized_distribution_name,
            store_observation,
            store_fingerprint,
            store_observed_at,
            created_at,
            updated_at
          ) VALUES (
            @id,
            @distributionName,
            @normalizedDistributionName,
            'available',
            @fingerprint,
            @createdAt,
            @createdAt,
            @createdAt
          )
        `).run({
          id,
          distributionName,
          normalizedDistributionName: normalizeSkillDistributionName(distributionName),
          fingerprint,
          createdAt,
        });
        this.database.prepare(`
          INSERT INTO skill_revisions (
            id, package_id, sequence_number, fingerprint, reason, created_at
          ) VALUES (@id, @packageId, 1, @fingerprint, 'import', @createdAt)
        `).run({
          id: revisionId,
          packageId: id,
          fingerprint,
          createdAt,
        });
        return {
          package: this.getActivePackageInternal(id),
          revision: this.getRevisionInternal(revisionId),
        };
      }).immediate();
    });
  }

  getActivePackage(idValue: unknown): SkillPackageMetadata {
    return this.execute(() => this.getActivePackageInternal(parseSkillId(idValue)));
  }

  getTrashedPackage(idValue: unknown): SkillTrashPackageMetadata {
    return this.execute(() => {
      const id = parseSkillId(idValue);
      const row = this.selectTrashedPackage(id);
      if (!row) {
        throw new SkillOperationError('not-found', 'Trashed Skill Package was not found.');
      }
      return this.mapTrashPackage(row);
    });
  }

  findTrashedPackageById(idValue: unknown): SkillTrashPackageMetadata | null {
    return this.execute(() => {
      const row = this.selectTrashedPackage(parseSkillId(idValue));
      return row ? this.mapTrashPackage(row) : null;
    });
  }

  isPackageRemoved(idValue: unknown): boolean {
    return this.execute(() => (this.database.prepare<[string], number>(`
      SELECT COUNT(*) FROM skill_packages WHERE id = ? AND removed_at IS NOT NULL
    `).pluck().get(parseSkillId(idValue)) ?? 0) === 1);
  }

  findActivePackageById(idValue: unknown): SkillPackageMetadata | null {
    return this.execute(() => {
      const id = parseSkillId(idValue);
      const row = this.selectActivePackage(id);
      return row ? this.mapPackage(row) : null;
    });
  }

  findActivePackageByFingerprint(fingerprintValue: unknown): SkillPackageMetadata | null {
    return this.execute(() => {
      const fingerprint = parseSkillContentFingerprint(fingerprintValue);
      const row = this.database.prepare<[string], SkillPackageRow>(`
        SELECT
          id,
          distribution_name,
          store_observation,
          store_fingerprint,
          store_observed_at,
          created_at,
          updated_at
        FROM skill_packages
        WHERE store_fingerprint = ?
          AND store_observation = 'available'
          AND trashed_at IS NULL
          AND removed_at IS NULL
        ORDER BY created_at, id
        LIMIT 1
      `).get(fingerprint);
      return row ? this.mapPackage(row) : null;
    });
  }

  listRevisions(packageIdValue: unknown): SkillRevisionMetadata[] {
    return this.execute(() => {
      const packageId = parseSkillId(packageIdValue);
      this.getActivePackageInternal(packageId);
      return this.database.prepare<[string], SkillRevisionRow>(`
        SELECT id, package_id, sequence_number, fingerprint, reason, created_at
        FROM skill_revisions
        WHERE package_id = ?
        ORDER BY sequence_number DESC
      `).all(packageId).map((row) => this.mapRevision(row));
    });
  }

  getRevision(packageIdValue: unknown, revisionIdValue: unknown): SkillRevisionMetadata {
    return this.execute(() => {
      const packageId = parseSkillId(packageIdValue);
      this.getActivePackageInternal(packageId);
      const revision = this.getRevisionInternal(parseSkillRevisionId(revisionIdValue));
      if (revision.packageId !== packageId) {
        throw new SkillOperationError('not-found', 'Skill Revision was not found.');
      }
      return revision;
    });
  }

  listActivePackages(limitValue = 500): SkillPackageMetadata[] {
    return this.execute(() => {
      if (!Number.isSafeInteger(limitValue) || limitValue < 1 || limitValue > 1000) {
        throw new SkillOperationError('invalid-input', 'Skill Package list limit is invalid.');
      }
      return this.database.prepare<[number], SkillPackageRow>(`
        SELECT
          id,
          distribution_name,
          store_observation,
          store_fingerprint,
          store_observed_at,
          created_at,
          updated_at
        FROM skill_packages
        WHERE trashed_at IS NULL AND removed_at IS NULL
        ORDER BY created_at, id
        LIMIT ?
      `).all(limitValue).map((row) => this.mapPackage(row));
    });
  }

  listTrashedPackages(limitValue = 500): SkillTrashPackageMetadata[] {
    return this.execute(() => {
      if (!Number.isSafeInteger(limitValue) || limitValue < 1 || limitValue > 1000) {
        throw new SkillOperationError('invalid-input', 'Skill Trash list limit is invalid.');
      }
      return this.database.prepare<[number], SkillTrashPackageRow>(`
        SELECT
          id,
          distribution_name,
          store_observation,
          store_fingerprint,
          store_observed_at,
          created_at,
          updated_at,
          trashed_at
        FROM skill_packages
        WHERE trashed_at IS NOT NULL AND removed_at IS NULL
        ORDER BY trashed_at DESC, id
        LIMIT ?
      `).all(limitValue).map((row) => this.mapTrashPackage(row));
    });
  }

  markPackageTrashed(packageIdValue: unknown, trashedAtValue: unknown): SkillTrashPackageMetadata {
    return this.execute(() => {
      const packageId = parseSkillId(packageIdValue);
      const trashedAt = parseTimestamp(trashedAtValue);
      return this.database.transaction(() => {
        this.getActivePackageInternal(packageId);
        const activeInstallationCount = this.database.prepare<[string], number>(`
          SELECT COUNT(*) FROM skill_installations
          WHERE package_id = ? AND uninstalled_at IS NULL
        `).pluck().get(packageId) ?? 0;
        if (activeInstallationCount > 0) {
          throw new SkillOperationError(
            'conflict',
            'Uninstall this Skill from every Distribution Target before moving it to Trash.',
          );
        }
        const result = this.database.prepare(`
          UPDATE skill_packages
          SET trashed_at = @trashedAt,
              updated_at = MAX(updated_at, @trashedAt)
          WHERE id = @packageId AND trashed_at IS NULL AND removed_at IS NULL
        `).run({ packageId, trashedAt });
        if (result.changes !== 1) {
          throw new SkillOperationError('not-found', 'Skill Package was not found.');
        }
        return this.mapTrashPackage(this.selectTrashedPackage(packageId)!);
      }).immediate();
    });
  }

  restoreTrashedPackage(
    packageIdValue: unknown,
    observation: SkillContentObservation,
    restoredAtValue: unknown,
  ): SkillPackageMetadata {
    return this.execute(() => {
      const packageId = parseSkillId(packageIdValue);
      const restoredAt = parseTimestamp(restoredAtValue);
      const parsedObservation = parseStoredSkillContentObservation(
        observation.status,
        observation.status === 'available' ? observation.fingerprint : null,
        observation.observedAt,
      );
      const fingerprint = parsedObservation.status === 'available'
        ? parsedObservation.fingerprint
        : null;
      const result = this.database.prepare(`
        UPDATE skill_packages
        SET trashed_at = NULL,
            store_observation = @status,
            store_fingerprint = @fingerprint,
            store_observed_at = @observedAt,
            updated_at = MAX(updated_at, @restoredAt)
        WHERE id = @packageId AND trashed_at IS NOT NULL AND removed_at IS NULL
      `).run({
        packageId,
        status: parsedObservation.status,
        fingerprint,
        observedAt: parsedObservation.observedAt,
        restoredAt,
      });
      if (result.changes !== 1) {
        throw new SkillOperationError('not-found', 'Trashed Skill Package was not found.');
      }
      return this.getActivePackageInternal(packageId);
    });
  }

  markTrashedPackageRemoved(packageIdValue: unknown, removedAtValue: unknown): void {
    this.execute(() => {
      const packageId = parseSkillId(packageIdValue);
      const removedAt = parseTimestamp(removedAtValue);
      const result = this.database.prepare(`
        UPDATE skill_packages
        SET removed_at = @removedAt,
            updated_at = MAX(updated_at, @removedAt)
        WHERE id = @packageId AND trashed_at IS NOT NULL AND removed_at IS NULL
      `).run({ packageId, removedAt });
      if (result.changes !== 1) {
        throw new SkillOperationError('not-found', 'Trashed Skill Package was not found.');
      }
    });
  }

  updateStoreObservation(
    packageIdValue: unknown,
    observation: SkillContentObservation,
  ): SkillPackageMetadata {
    return this.execute(() => {
      const packageId = parseSkillId(packageIdValue);
      const parsedObservation = parseStoredSkillContentObservation(
        observation.status,
        observation.status === 'available' ? observation.fingerprint : null,
        observation.observedAt,
      );
      const fingerprint = parsedObservation.status === 'available'
        ? parsedObservation.fingerprint
        : null;
      const result = this.database.prepare(`
        UPDATE skill_packages
        SET store_observation = @status,
            store_fingerprint = @fingerprint,
            store_observed_at = @observedAt,
            updated_at = CASE
              WHEN store_observation != @status
                OR store_fingerprint IS NOT @fingerprint
              THEN MAX(updated_at, @observedAt)
              ELSE updated_at
            END
        WHERE id = @packageId AND trashed_at IS NULL AND removed_at IS NULL
      `).run({
        packageId,
        status: parsedObservation.status,
        fingerprint,
        observedAt: parsedObservation.observedAt,
      });
      if (result.changes !== 1) {
        throw new SkillOperationError('not-found', 'Skill Package was not found.');
      }
      return this.getActivePackageInternal(packageId);
    });
  }

  findRevisionById(idValue: unknown): SkillRevisionMetadata | null {
    return this.execute(() => {
      const id = parseSkillRevisionId(idValue);
      const row = this.selectRevision(id);
      return row ? this.mapRevision(row) : null;
    });
  }

  findRevisionByFingerprint(
    packageIdValue: unknown,
    fingerprintValue: unknown,
  ): SkillRevisionMetadata | null {
    return this.execute(() => {
      const packageId = parseSkillId(packageIdValue);
      const fingerprint = parseSkillContentFingerprint(fingerprintValue);
      const row = this.database.prepare<[string, string], SkillRevisionRow>(`
        SELECT id, package_id, sequence_number, fingerprint, reason, created_at
        FROM skill_revisions
        WHERE package_id = ? AND fingerprint = ?
        ORDER BY sequence_number
        LIMIT 1
      `).get(packageId, fingerprint);
      return row ? this.mapRevision(row) : null;
    });
  }

  createRevision(input: CreateSkillRevisionInput): SkillRevisionMetadata {
    return this.execute(() => {
      const id = parseSkillRevisionId(input.id);
      const packageId = parseSkillId(input.packageId);
      const fingerprint = parseSkillContentFingerprint(input.fingerprint);
      const reason = parseRevisionReason(input.reason);
      const createdAt = parseTimestamp(input.createdAt);
      return this.database.transaction(() => {
        this.getActivePackageInternal(packageId);
        const sequenceNumber = this.database.prepare<[string], number>(`
          SELECT COALESCE(MAX(sequence_number), 0) + 1
          FROM skill_revisions
          WHERE package_id = ?
        `).pluck().get(packageId);
        this.database.prepare(`
          INSERT INTO skill_revisions (
            id, package_id, sequence_number, fingerprint, reason, created_at
          ) VALUES (
            @id, @packageId, @sequenceNumber, @fingerprint, @reason, @createdAt
          )
        `).run({ id, packageId, sequenceNumber, fingerprint, reason, createdAt });
        return this.getRevisionInternal(id);
      }).immediate();
    });
  }

  commitStorePromotion(
    input: CommitSkillStorePromotionInput,
  ): CommitSkillStorePromotionResult {
    return this.execute(() => {
      const packageId = parseSkillId(input.packageId);
      const fingerprint = parseSkillContentFingerprint(input.observation.fingerprint);
      const observedAt = parseTimestamp(input.observation.observedAt);
      if (input.revision.packageId !== packageId || input.revision.fingerprint !== fingerprint) {
        throw new SkillOperationError('invalid-input', 'Skill promotion metadata is invalid.');
      }
      return this.database.transaction(() => {
        this.getActivePackageInternal(packageId);
        let revision: SkillRevisionMetadata;
        if (input.createRevision) {
          const revisionId = parseSkillRevisionId(input.revision.id);
          const reason = parseRevisionReason(input.revision.reason);
          const createdAt = parseTimestamp(input.revision.createdAt);
          const sequenceNumber = this.database.prepare<[string], number>(`
            SELECT COALESCE(MAX(sequence_number), 0) + 1
            FROM skill_revisions
            WHERE package_id = ?
          `).pluck().get(packageId);
          this.database.prepare(`
            INSERT INTO skill_revisions (
              id, package_id, sequence_number, fingerprint, reason, created_at
            ) VALUES (
              @id, @packageId, @sequenceNumber, @fingerprint, @reason, @createdAt
            )
          `).run({
            id: revisionId,
            packageId,
            sequenceNumber,
            fingerprint,
            reason,
            createdAt,
          });
          revision = this.getRevisionInternal(revisionId);
        } else {
          revision = this.getRevisionInternal(parseSkillRevisionId(input.revision.id));
          if (revision.packageId !== packageId || revision.fingerprint !== fingerprint) {
            throw new SkillOperationError('conflict', 'Skill Revision no longer matches.');
          }
        }
        this.database.prepare(`
          UPDATE skill_packages
          SET store_observation = 'available',
              store_fingerprint = @fingerprint,
              store_observed_at = @observedAt,
              updated_at = MAX(updated_at, @observedAt)
          WHERE id = @packageId AND trashed_at IS NULL AND removed_at IS NULL
        `).run({ packageId, fingerprint, observedAt });
        return { package: this.getActivePackageInternal(packageId), revision };
      }).immediate();
    });
  }
}

function parseTimestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new SkillOperationError('invalid-input', 'Skill input is invalid.');
  }
  return value;
}

function parseStoredTimestamp(value: unknown, message: string): number {
  try {
    return parseTimestamp(value);
  } catch {
    throw new SkillOperationError('storage-corrupt', message);
  }
}

function parseStoredId(
  value: unknown,
  parse: (input: unknown) => string,
  message: string,
): string {
  try {
    return parse(value);
  } catch {
    throw new SkillOperationError('storage-corrupt', message);
  }
}

function parseStoredDistributionName(value: unknown): string {
  try {
    return parseSkillDistributionName(value);
  } catch {
    throw new SkillOperationError('storage-corrupt', 'Stored Skill Package data is invalid.');
  }
}

function parseStoredFingerprint(value: unknown): string {
  try {
    return parseSkillContentFingerprint(value);
  } catch {
    throw new SkillOperationError('storage-corrupt', 'Stored Skill Revision data is invalid.');
  }
}

function parseRevisionReason(value: unknown): SkillRevisionReason {
  if (!skillRevisionReasons.includes(value as SkillRevisionReason)) {
    throw new SkillOperationError('invalid-input', 'Skill Revision reason is invalid.');
  }
  return value as SkillRevisionReason;
}
