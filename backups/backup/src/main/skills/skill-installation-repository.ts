import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { SkillContentFingerprint } from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import {
  normalizeSkillDistributionName,
  normalizeSkillRelativePath,
  parseSkillContentFingerprint,
  parseSkillDistributionName,
  parseSkillId,
  parseSkillInstallationId,
  parseSkillRelativePath,
  parseSkillTargetId,
} from './skill-validation';

interface SkillInstallationRow {
  id: string;
  package_id: string;
  target_id: string;
  distribution_name: string;
  relative_path: string;
  distributed_fingerprint: string;
  created_at: number;
  updated_at: number;
}

export interface SkillInstallationMetadata {
  id: string;
  packageId: string;
  targetId: string;
  distributionName: string;
  relativePath: string;
  distributedFingerprint: SkillContentFingerprint;
  createdAt: number;
  updatedAt: number;
}

export interface AdoptSkillInstallationInput {
  packageId: string;
  targetId: string;
  distributionName: string;
  relativePath: string;
  fingerprint: string;
  importedAt: number;
}

export interface AdoptSkillInstallationResult {
  installation: SkillInstallationMetadata;
  reused: boolean;
}

export interface RecordSkillDistributionInput {
  installationId: string;
  packageId: string;
  targetId: string;
  distributionName: string;
  relativePath: string;
  fingerprint: string;
  distributedAt: number;
}

export interface RecordSkillDistributionResult {
  installation: SkillInstallationMetadata;
  created: boolean;
}

export class SkillInstallationRepository {
  private readonly createId: () => string;
  private readonly now: () => number;

  constructor(
    private readonly database: Database.Database,
    options: { createId?: () => string; now?: () => number } = {},
  ) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? Date.now;
  }

  findActiveInstallationByLocation(
    targetIdValue: unknown,
    relativePathValue: unknown,
  ): SkillInstallationMetadata | null {
    return this.execute(() => {
      const targetId = parseSkillTargetId(targetIdValue);
      const relativePath = parseSkillRelativePath(relativePathValue);
      const row = this.selectActiveByLocation(targetId, normalizeSkillRelativePath(relativePath));
      return row ? this.mapInstallation(row) : null;
    });
  }

  findActiveInstallationByDistributionName(
    targetIdValue: unknown,
    distributionNameValue: unknown,
  ): SkillInstallationMetadata | null {
    return this.execute(() => {
      const targetId = parseSkillTargetId(targetIdValue);
      const distributionName = parseSkillDistributionName(distributionNameValue);
      const row = this.database.prepare<[string, string], SkillInstallationRow>(`
        SELECT * FROM skill_installations
        WHERE target_id = ?
          AND normalized_distribution_name = ?
          AND uninstalled_at IS NULL
      `).get(targetId, normalizeSkillDistributionName(distributionName));
      return row ? this.mapInstallation(row) : null;
    });
  }

  getActiveInstallation(installationIdValue: unknown): SkillInstallationMetadata {
    return this.execute(() => this.getActiveById(parseSkillInstallationId(installationIdValue)));
  }

  isInstallationActive(installationIdValue: unknown): boolean {
    return this.execute(() => this.selectActiveById(
      parseSkillInstallationId(installationIdValue),
    ) !== undefined);
  }

  listActiveInstallations(targetIdValue?: unknown): SkillInstallationMetadata[] {
    return this.execute(() => {
      const rows = targetIdValue === undefined
        ? this.database.prepare<[], SkillInstallationRow>(`
            SELECT * FROM skill_installations
            WHERE uninstalled_at IS NULL
            ORDER BY target_id, relative_path_key, id
          `).all()
        : this.database.prepare<[string], SkillInstallationRow>(`
            SELECT * FROM skill_installations
            WHERE target_id = ? AND uninstalled_at IS NULL
            ORDER BY relative_path_key, id
          `).all(parseSkillTargetId(targetIdValue));
      return rows.map((row) => this.mapInstallation(row));
    });
  }

  listActiveInstallationsForPackage(packageIdValue: unknown): SkillInstallationMetadata[] {
    return this.execute(() => this.database.prepare<[string], SkillInstallationRow>(`
      SELECT * FROM skill_installations
      WHERE package_id = ? AND uninstalled_at IS NULL
      ORDER BY target_id, relative_path_key, id
    `).all(parseSkillId(packageIdValue)).map((row) => this.mapInstallation(row)));
  }

  countActiveInstallationsForPackage(packageIdValue: unknown): number {
    return this.execute(() => this.database.prepare<[string], number>(`
      SELECT COUNT(*) FROM skill_installations
      WHERE package_id = ? AND uninstalled_at IS NULL
    `).pluck().get(parseSkillId(packageIdValue)) ?? 0);
  }

  adoptInstallation(input: AdoptSkillInstallationInput): AdoptSkillInstallationResult {
    return this.execute(() => {
      const packageId = parseSkillId(input.packageId);
      const targetId = parseSkillTargetId(input.targetId);
      const distributionName = parseSkillDistributionName(input.distributionName);
      const relativePath = parseSkillRelativePath(input.relativePath);
      const fingerprint = parseSkillContentFingerprint(input.fingerprint);
      const importedAt = parseTimestamp(input.importedAt);
      return this.database.transaction(() => {
        const existing = this.selectActiveByLocation(
          targetId,
          normalizeSkillRelativePath(relativePath),
        );
        if (existing) {
          return { installation: this.mapInstallation(existing), reused: true };
        }
        const installationId = parseSkillInstallationId(this.createId());
        this.insertInstallation({
          installationId,
          packageId,
          targetId,
          distributionName,
          relativePath,
          fingerprint,
          timestamp: importedAt,
        });
        return {
          installation: this.getActiveById(installationId),
          reused: false,
        };
      }).immediate();
    });
  }

  recordDistribution(input: RecordSkillDistributionInput): RecordSkillDistributionResult {
    return this.execute(() => {
      const installationId = parseSkillInstallationId(input.installationId);
      const packageId = parseSkillId(input.packageId);
      const targetId = parseSkillTargetId(input.targetId);
      const distributionName = parseSkillDistributionName(input.distributionName);
      const relativePath = parseSkillRelativePath(input.relativePath);
      const fingerprint = parseSkillContentFingerprint(input.fingerprint);
      const distributedAt = parseTimestamp(input.distributedAt);
      return this.database.transaction(() => {
        const existingAtLocation = this.selectActiveByLocation(
          targetId,
          normalizeSkillRelativePath(relativePath),
        );
        if (existingAtLocation?.id === installationId) {
          const result = this.database.prepare(`
            UPDATE skill_installations
            SET package_id = @packageId,
                distribution_name = @distributionName,
                normalized_distribution_name = @normalizedDistributionName,
                distributed_fingerprint = @fingerprint,
                updated_at = MAX(updated_at, @distributedAt)
            WHERE id = @installationId AND uninstalled_at IS NULL
          `).run({
            installationId,
            packageId,
            distributionName,
            normalizedDistributionName: normalizeSkillDistributionName(distributionName),
            fingerprint,
            distributedAt,
          });
          if (result.changes !== 1) {
            throw new SkillOperationError('not-found', 'Skill Installation was not found.');
          }
          return { installation: this.getActiveById(installationId), created: false };
        }
        if (existingAtLocation) {
          this.markUninstalledInternal(existingAtLocation.id, distributedAt);
        }
        if (this.selectActiveById(installationId)) {
          throw new SkillOperationError('conflict', 'Skill Installation identity is occupied.');
        }
        this.insertInstallation({
          installationId,
          packageId,
          targetId,
          distributionName,
          relativePath,
          fingerprint,
          timestamp: distributedAt,
        });
        return { installation: this.getActiveById(installationId), created: true };
      }).immediate();
    });
  }

  markInstallationUninstalled(
    installationIdValue: unknown,
    uninstalledAtValue: unknown = this.now(),
  ): SkillInstallationMetadata {
    return this.execute(() => {
      const installationId = parseSkillInstallationId(installationIdValue);
      const uninstalledAt = parseTimestamp(uninstalledAtValue);
      const installation = this.getActiveById(installationId);
      this.markUninstalledInternal(installationId, uninstalledAt);
      return installation;
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

  private selectActiveByLocation(
    targetId: string,
    relativePathKey: string,
  ): SkillInstallationRow | undefined {
    return this.database.prepare<[string, string], SkillInstallationRow>(`
      SELECT * FROM skill_installations
      WHERE target_id = ?
        AND relative_path_key = ?
        AND uninstalled_at IS NULL
    `).get(targetId, relativePathKey);
  }

  private selectActiveById(id: string): SkillInstallationRow | undefined {
    return this.database.prepare<[string], SkillInstallationRow>(`
      SELECT * FROM skill_installations
      WHERE id = ? AND uninstalled_at IS NULL
    `).get(id);
  }

  private getActiveById(id: string): SkillInstallationMetadata {
    const row = this.selectActiveById(id);
    if (!row) {
      throw new SkillOperationError('not-found', 'Skill Installation was not found.');
    }
    return this.mapInstallation(row);
  }

  private insertInstallation(input: {
    installationId: string;
    packageId: string;
    targetId: string;
    distributionName: string;
    relativePath: string;
    fingerprint: string;
    timestamp: number;
  }): void {
    this.database.prepare(`
      INSERT INTO skill_installations (
        id,
        package_id,
        target_id,
        distribution_name,
        normalized_distribution_name,
        relative_path,
        relative_path_key,
        distributed_fingerprint,
        created_at,
        updated_at
      ) VALUES (
        @installationId,
        @packageId,
        @targetId,
        @distributionName,
        @normalizedDistributionName,
        @relativePath,
        @relativePathKey,
        @fingerprint,
        @timestamp,
        @timestamp
      )
    `).run({
      ...input,
      normalizedDistributionName: normalizeSkillDistributionName(input.distributionName),
      relativePathKey: normalizeSkillRelativePath(input.relativePath),
    });
  }

  private markUninstalledInternal(installationId: string, uninstalledAt: number): void {
    const result = this.database.prepare(`
      UPDATE skill_installations
      SET uninstalled_at = @uninstalledAt,
          updated_at = MAX(updated_at, @uninstalledAt)
      WHERE id = @installationId AND uninstalled_at IS NULL
    `).run({ installationId, uninstalledAt });
    if (result.changes !== 1) {
      throw new SkillOperationError('not-found', 'Skill Installation was not found.');
    }
  }

  private mapInstallation(row: SkillInstallationRow): SkillInstallationMetadata {
    const createdAt = parseStoredTimestamp(row.created_at);
    const updatedAt = parseStoredTimestamp(row.updated_at);
    if (updatedAt < createdAt) {
      throw storedInstallationError();
    }
    return {
      id: parseStoredValue(row.id, parseSkillInstallationId),
      packageId: parseStoredValue(row.package_id, parseSkillId),
      targetId: parseStoredValue(row.target_id, parseSkillTargetId),
      distributionName: parseStoredValue(row.distribution_name, parseSkillDistributionName),
      relativePath: parseStoredValue(row.relative_path, parseSkillRelativePath),
      distributedFingerprint: parseStoredValue(
        row.distributed_fingerprint,
        parseSkillContentFingerprint,
      ),
      createdAt,
      updatedAt,
    };
  }
}

function parseTimestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new SkillOperationError('invalid-input', 'Skill Installation timestamp is invalid.');
  }
  return value;
}

function parseStoredTimestamp(value: unknown): number {
  try {
    return parseTimestamp(value);
  } catch {
    throw storedInstallationError();
  }
}

function parseStoredValue<T>(value: unknown, parse: (input: unknown) => T): T {
  try {
    return parse(value);
  } catch {
    throw storedInstallationError();
  }
}

function storedInstallationError(): SkillOperationError {
  return new SkillOperationError('storage-corrupt', 'Stored Skill Installation data is invalid.');
}
