import { Buffer } from 'node:buffer';
import type Database from 'better-sqlite3';
import type { SkillContentFingerprint } from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import { SKILL_PACKAGE_CONTENT_FORMAT } from './skill-package-codec';
import {
  normalizeSkillDistributionName,
  parseSkillContentFingerprint,
  parseSkillDistributionName,
  parseSkillId,
} from './skill-validation';

interface SkillPackageRow {
  id: string;
  distribution_name: string;
  description: string | null;
  content_fingerprint: string;
  created_at: number;
  updated_at: number;
}

interface SkillPackageContentRow extends SkillPackageRow {
  content_format: string;
  content_blob: Buffer;
}

interface SkillTrashPackageRow extends SkillPackageRow {
  trashed_at: number;
}

export interface SkillPackageMetadata {
  id: string;
  distributionName: string;
  description: string | null;
  fingerprint: SkillContentFingerprint;
  createdAt: number;
  updatedAt: number;
}

export interface SkillPackageContent extends SkillPackageMetadata {
  format: typeof SKILL_PACKAGE_CONTENT_FORMAT;
  content: Buffer;
}

export interface SkillTrashPackageMetadata extends SkillPackageMetadata {
  trashedAt: number;
}

export interface CreateImportedPackageInput {
  id: string;
  distributionName: string;
  fingerprint: string;
  content: Uint8Array;
  description?: string | null;
  createdAt: number;
}

export interface ReplaceSkillPackageContentInput {
  packageId: string;
  distributionName: string;
  fingerprint: string;
  content: Uint8Array;
  description?: string | null;
  updatedAt: number;
}

export class SkillMetadataRepository {
  constructor(private readonly database: Database.Database) {}

  createImportedPackage(input: CreateImportedPackageInput): SkillPackageMetadata {
    return this.execute(() => {
      const id = parseSkillId(input.id);
      const distributionName = parseSkillDistributionName(input.distributionName);
      const fingerprint = parseSkillContentFingerprint(input.fingerprint);
      const content = parseContent(input.content);
      const createdAt = parseTimestamp(input.createdAt);
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
          @id,
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
        id,
        distributionName,
        normalizedDistributionName: normalizeSkillDistributionName(distributionName),
        description: parseDescription(input.description),
        fingerprint,
        content,
        createdAt,
      });
      return this.getActivePackageInternal(id);
    });
  }

  replacePackageContent(input: ReplaceSkillPackageContentInput): SkillPackageMetadata {
    return this.execute(() => {
      const packageId = parseSkillId(input.packageId);
      const distributionName = parseSkillDistributionName(input.distributionName);
      const fingerprint = parseSkillContentFingerprint(input.fingerprint);
      const content = parseContent(input.content);
      const updatedAt = parseTimestamp(input.updatedAt);
      const result = this.database.prepare(`
        UPDATE skill_packages
        SET distribution_name = @distributionName,
            normalized_distribution_name = @normalizedDistributionName,
            description = @description,
            content_format = '${SKILL_PACKAGE_CONTENT_FORMAT}',
            content_fingerprint = @fingerprint,
            content_blob = @content,
            updated_at = MAX(updated_at, @updatedAt)
        WHERE id = @packageId AND trashed_at IS NULL AND removed_at IS NULL
      `).run({
        packageId,
        distributionName,
        normalizedDistributionName: normalizeSkillDistributionName(distributionName),
        description: parseDescription(input.description),
        fingerprint,
        content,
        updatedAt,
      });
      if (result.changes !== 1) {
        throw new SkillOperationError('not-found', 'Skill Package was not found.');
      }
      return this.getActivePackageInternal(packageId);
    });
  }

  getActivePackage(idValue: unknown): SkillPackageMetadata {
    return this.execute(() => this.getActivePackageInternal(parseSkillId(idValue)));
  }

  getActivePackageContent(idValue: unknown): SkillPackageContent {
    return this.execute(() => {
      const id = parseSkillId(idValue);
      const row = this.database.prepare<[string], SkillPackageContentRow>(`
        SELECT
          id,
          distribution_name,
          description,
          content_format,
          content_fingerprint,
          content_blob,
          created_at,
          updated_at
        FROM skill_packages
        WHERE id = ? AND trashed_at IS NULL AND removed_at IS NULL
      `).get(id);
      if (!row) {
        throw new SkillOperationError('not-found', 'Skill Package was not found.');
      }
      return this.mapPackageContent(row);
    });
  }

  getTrashedPackage(idValue: unknown): SkillTrashPackageMetadata {
    return this.execute(() => {
      const row = this.selectTrashedPackage(parseSkillId(idValue));
      if (!row) {
        throw new SkillOperationError('not-found', 'Trashed Skill Package was not found.');
      }
      return this.mapTrashPackage(row);
    });
  }

  findActivePackageById(idValue: unknown): SkillPackageMetadata | null {
    return this.execute(() => {
      const row = this.selectActivePackage(parseSkillId(idValue));
      return row ? this.mapPackage(row) : null;
    });
  }

  findTrashedPackageById(idValue: unknown): SkillTrashPackageMetadata | null {
    return this.execute(() => {
      const row = this.selectTrashedPackage(parseSkillId(idValue));
      return row ? this.mapTrashPackage(row) : null;
    });
  }

  findActivePackageByFingerprint(fingerprintValue: unknown): SkillPackageMetadata | null {
    return this.execute(() => {
      const fingerprint = parseSkillContentFingerprint(fingerprintValue);
      const row = this.database.prepare<[string], SkillPackageRow>(`
        SELECT id, distribution_name, description, content_fingerprint, created_at, updated_at
        FROM skill_packages
        WHERE content_fingerprint = ?
          AND trashed_at IS NULL
          AND removed_at IS NULL
        ORDER BY created_at, id
        LIMIT 1
      `).get(fingerprint);
      return row ? this.mapPackage(row) : null;
    });
  }

  listActivePackages(limitValue = 500): SkillPackageMetadata[] {
    return this.execute(() => {
      const limit = parseListLimit(limitValue);
      return this.database.prepare<[number], SkillPackageRow>(`
        SELECT id, distribution_name, description, content_fingerprint, created_at, updated_at
        FROM skill_packages
        WHERE trashed_at IS NULL AND removed_at IS NULL
        ORDER BY created_at, id
        LIMIT ?
      `).all(limit).map((row) => this.mapPackage(row));
    });
  }

  listTrashedPackages(limitValue = 500): SkillTrashPackageMetadata[] {
    return this.execute(() => {
      const limit = parseListLimit(limitValue);
      return this.database.prepare<[number], SkillTrashPackageRow>(`
        SELECT
          id,
          distribution_name,
          description,
          content_fingerprint,
          created_at,
          updated_at,
          trashed_at
        FROM skill_packages
        WHERE trashed_at IS NOT NULL AND removed_at IS NULL
        ORDER BY trashed_at DESC, id
        LIMIT ?
      `).all(limit).map((row) => this.mapTrashPackage(row));
    });
  }

  commitStoreDeletion(
    packageIdValue: unknown,
    trashedAtValue: unknown,
  ): SkillTrashPackageMetadata {
    return this.execute(() => {
      const packageId = parseSkillId(packageIdValue);
      const trashedAt = parseTimestamp(trashedAtValue);
      return this.database.transaction(() => {
        this.getActivePackageInternal(packageId);
        this.database.prepare(`
          UPDATE skill_installations
          SET uninstalled_at = @trashedAt,
              updated_at = MAX(updated_at, @trashedAt)
          WHERE package_id = @packageId AND uninstalled_at IS NULL
        `).run({ packageId, trashedAt });
        const result = this.database.prepare(`
          UPDATE skill_packages
          SET trashed_at = @trashedAt,
              updated_at = MAX(updated_at, @trashedAt)
          WHERE id = @packageId AND trashed_at IS NULL AND removed_at IS NULL
        `).run({ packageId, trashedAt });
        if (result.changes !== 1) {
          throw new SkillOperationError('not-found', 'Skill Package was not found.');
        }
        return this.getTrashedPackageInternal(packageId);
      }).immediate();
    });
  }

  restoreTrashedPackage(
    packageIdValue: unknown,
    restoredAtValue: unknown,
  ): SkillPackageMetadata {
    return this.execute(() => {
      const packageId = parseSkillId(packageIdValue);
      const restoredAt = parseTimestamp(restoredAtValue);
      this.getTrashedPackageInternal(packageId);
      const result = this.database.prepare(`
        UPDATE skill_packages
        SET trashed_at = NULL,
            updated_at = MAX(updated_at, @restoredAt)
        WHERE id = @packageId AND trashed_at IS NOT NULL AND removed_at IS NULL
      `).run({ packageId, restoredAt });
      if (result.changes !== 1) {
        throw new SkillOperationError('not-found', 'Trashed Skill Package was not found.');
      }
      return this.getActivePackageInternal(packageId);
    });
  }

  markTrashedPackageRemoved(
    packageIdValue: unknown,
    removedAtValue: unknown,
  ): SkillTrashPackageMetadata {
    return this.execute(() => {
      const packageId = parseSkillId(packageIdValue);
      const removedAt = parseTimestamp(removedAtValue);
      const skillPackage = this.getTrashedPackageInternal(packageId);
      const result = this.database.prepare(`
        UPDATE skill_packages
        SET removed_at = @removedAt,
            updated_at = MAX(updated_at, @removedAt)
        WHERE id = @packageId AND trashed_at IS NOT NULL AND removed_at IS NULL
      `).run({ packageId, removedAt });
      if (result.changes !== 1) {
        throw new SkillOperationError('not-found', 'Trashed Skill Package was not found.');
      }
      return skillPackage;
    });
  }

  isPackageRemoved(idValue: unknown): boolean {
    return this.execute(() => (this.database.prepare<[string], number>(`
      SELECT COUNT(*) FROM skill_packages WHERE id = ? AND removed_at IS NOT NULL
    `).pluck().get(parseSkillId(idValue)) ?? 0) === 1);
  }

  // eslint-disable-next-line unicorn/consistent-class-member-order
  private execute<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw toSkillOperationError(error);
    }
  }

  private selectActivePackage(id: string): SkillPackageRow | undefined {
    return this.database.prepare<[string], SkillPackageRow>(`
        SELECT id, distribution_name, description, content_fingerprint, created_at, updated_at
      FROM skill_packages
      WHERE id = ? AND trashed_at IS NULL AND removed_at IS NULL
    `).get(id);
  }

  private selectTrashedPackage(id: string): SkillTrashPackageRow | undefined {
    return this.database.prepare<[string], SkillTrashPackageRow>(`
      SELECT
        id,
          distribution_name,
          description,
        content_fingerprint,
        created_at,
        updated_at,
        trashed_at
      FROM skill_packages
      WHERE id = ? AND trashed_at IS NOT NULL AND removed_at IS NULL
    `).get(id);
  }

  private getActivePackageInternal(id: string): SkillPackageMetadata {
    const row = this.selectActivePackage(id);
    if (!row) {
      throw new SkillOperationError('not-found', 'Skill Package was not found.');
    }
    return this.mapPackage(row);
  }

  private getTrashedPackageInternal(id: string): SkillTrashPackageMetadata {
    const row = this.selectTrashedPackage(id);
    if (!row) {
      throw new SkillOperationError('not-found', 'Trashed Skill Package was not found.');
    }
    return this.mapTrashPackage(row);
  }

  private mapPackage(row: SkillPackageRow): SkillPackageMetadata {
    const id = parseStoredId(row.id);
    const distributionName = parseStoredDistributionName(row.distribution_name);
    const description = parseStoredDescription(row.description);
    const fingerprint = parseStoredFingerprint(row.content_fingerprint);
    const createdAt = parseStoredTimestamp(row.created_at);
    const updatedAt = parseStoredTimestamp(row.updated_at);
    if (updatedAt < createdAt) {
      throw storedPackageError();
    }
    return { id, distributionName, description, fingerprint, createdAt, updatedAt };
  }

  private mapPackageContent(row: SkillPackageContentRow): SkillPackageContent {
    if (row.content_format !== SKILL_PACKAGE_CONTENT_FORMAT || !Buffer.isBuffer(row.content_blob)) {
      throw storedPackageError();
    }
    return {
      ...this.mapPackage(row),
      format: SKILL_PACKAGE_CONTENT_FORMAT,
      content: Buffer.from(row.content_blob),
    };
  }

  private mapTrashPackage(row: SkillTrashPackageRow): SkillTrashPackageMetadata {
    return {
      ...this.mapPackage(row),
      trashedAt: parseStoredTimestamp(row.trashed_at),
    };
  }
}

function parseContent(value: Uint8Array): Buffer {
  const content = Buffer.from(value);
  if (content.length === 0) {
    throw new SkillOperationError('invalid-input', 'Skill Package content is empty.');
  }
  return content;
}

function parseListLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 1000) {
    throw new SkillOperationError('invalid-input', 'Skill Package list limit is invalid.');
  }
  return value;
}

function parseTimestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new SkillOperationError('invalid-input', 'Skill Package timestamp is invalid.');
  }
  return value;
}

function parseStoredId(value: unknown): string {
  try {
    return parseSkillId(value);
  } catch {
    throw storedPackageError();
  }
}

function parseStoredDistributionName(value: unknown): string {
  try {
    return parseSkillDistributionName(value);
  } catch {
    throw storedPackageError();
  }
}

function parseDescription(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new SkillOperationError('invalid-input', 'Skill Package description is invalid.');
  }
  const description = value.trim();
  return description.length > 0 ? description : null;
}

function parseStoredDescription(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw storedPackageError();
  }
  const description = value.trim();
  return description.length > 0 ? description : null;
}

function parseStoredFingerprint(value: unknown): string {
  try {
    return parseSkillContentFingerprint(value);
  } catch {
    throw storedPackageError();
  }
}

function parseStoredTimestamp(value: unknown): number {
  try {
    return parseTimestamp(value);
  } catch {
    throw storedPackageError();
  }
}

function storedPackageError(): SkillOperationError {
  return new SkillOperationError('storage-corrupt', 'Stored Skill Package data is invalid.');
}
