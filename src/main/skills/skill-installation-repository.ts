import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
  SkillContentObservation,
  SkillDistributionOperation,
} from '../../shared/skill-contract';
import { skillDistributionOperations } from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import {
  normalizeSkillDistributionName,
  normalizeSkillRelativePath,
  parseSkillContentFingerprint,
  parseSkillDistributionName,
  parseSkillDistributionRecordId,
  parseSkillId,
  parseSkillInstallationId,
  parseSkillRelativePath,
  parseSkillRevisionId,
  parseSkillTargetId,
  parseStoredSkillContentObservation,
} from './skill-validation';

interface SkillInstallationRow {
  id: string;
  package_id: string;
  target_id: string;
  distribution_name: string;
  relative_path: string;
  target_observation: string;
  target_fingerprint: string | null;
  target_observed_at: number;
  created_at: number;
  updated_at: number;
}

interface SkillDistributionRecordRow {
  id: string;
  installation_id: string;
  package_id: string;
  revision_id: string;
  sequence_number: number;
  operation: string;
  fingerprint: string;
  created_at: number;
}

interface SkillInstallationRepositoryOptions {
  createId?: () => string;
  now?: () => number;
}

export interface SkillInstallationMetadata {
  id: string;
  packageId: string;
  targetId: string;
  distributionName: string;
  relativePath: string;
  targetObservation: SkillContentObservation;
  createdAt: number;
  updatedAt: number;
}

export interface SkillDistributionRecordMetadata {
  id: string;
  installationId: string;
  packageId: string;
  revisionId: string;
  sequenceNumber: number;
  operation: SkillDistributionOperation;
  fingerprint: string;
  createdAt: number;
}

export interface AdoptSkillInstallationInput {
  packageId: string;
  targetId: string;
  revisionId: string;
  distributionName: string;
  relativePath: string;
  fingerprint: string;
  observedAt: number;
}

export type AdoptSkillInstallationResult
  = | {
    installation: SkillInstallationMetadata;
    distributionRecord: SkillDistributionRecordMetadata;
    reused: false;
  }
  | {
    installation: SkillInstallationMetadata;
    distributionRecord: null;
    reused: true;
  };

export interface RecordSkillDistributionInput {
  installationId: string;
  distributionRecordId: string;
  packageId: string;
  targetId: string;
  revisionId: string;
  distributionName: string;
  relativePath: string;
  fingerprint: string;
  operation: Extract<SkillDistributionOperation, 'distribution' | 'restore'>;
  observedAt: number;
}

export interface RecordSkillDistributionResult {
  installation: SkillInstallationMetadata;
  distributionRecord: SkillDistributionRecordMetadata;
  created: boolean;
}

export class SkillInstallationRepository {
  private readonly createId: () => string;
  private readonly now: () => number;

  constructor(
    private readonly database: Database.Database,
    options: SkillInstallationRepositoryOptions = {},
  ) {
    this.createId = options.createId ?? randomUUID;
    this.now = options.now ?? Date.now;
  }

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

  private getDistributionRecord(id: string): SkillDistributionRecordMetadata {
    const row = this.database.prepare<[string], SkillDistributionRecordRow>(`
      SELECT * FROM skill_distribution_records WHERE id = ?
    `).get(id);
    if (!row) {
      throw new SkillOperationError('not-found', 'Distribution Record was not found.');
    }
    return this.mapDistributionRecord(row);
  }

  private mapInstallation(row: SkillInstallationRow): SkillInstallationMetadata {
    const id = parseStoredId(row.id, parseSkillInstallationId);
    const packageId = parseStoredId(row.package_id, parseSkillId);
    const targetId = parseStoredId(row.target_id, parseSkillTargetId);
    const distributionName = parseStoredDistributionName(row.distribution_name);
    const relativePath = parseStoredRelativePath(row.relative_path);
    const targetObservation = parseStoredSkillContentObservation(
      row.target_observation,
      row.target_fingerprint,
      row.target_observed_at,
    );
    const createdAt = parseStoredTimestamp(row.created_at);
    const updatedAt = parseStoredTimestamp(row.updated_at);
    if (updatedAt < createdAt) {
      throw storedInstallationError();
    }
    return {
      id,
      packageId,
      targetId,
      distributionName,
      relativePath,
      targetObservation,
      createdAt,
      updatedAt,
    };
  }

  private mapDistributionRecord(
    row: SkillDistributionRecordRow,
  ): SkillDistributionRecordMetadata {
    const operation = row.operation as SkillDistributionOperation;
    if (
      !skillDistributionOperations.includes(operation)
      || !Number.isSafeInteger(row.sequence_number)
      || row.sequence_number < 1
    ) {
      throw storedInstallationError();
    }
    return {
      id: parseStoredId(row.id, parseSkillDistributionRecordId),
      installationId: parseStoredId(row.installation_id, parseSkillInstallationId),
      packageId: parseStoredId(row.package_id, parseSkillId),
      revisionId: parseStoredId(row.revision_id, parseSkillRevisionId),
      sequenceNumber: row.sequence_number,
      operation,
      fingerprint: parseStoredFingerprint(row.fingerprint),
      createdAt: parseStoredTimestamp(row.created_at),
    };
  }

  private updateObservationInternal(
    installationId: string,
    observation: SkillContentObservation,
  ): SkillInstallationMetadata {
    const parsedObservation = parseStoredSkillContentObservation(
      observation.status,
      observation.status === 'available' ? observation.fingerprint : null,
      observation.observedAt,
    );
    const fingerprint = parsedObservation.status === 'available'
      ? parsedObservation.fingerprint
      : null;
    const result = this.database.prepare(`
      UPDATE skill_installations
      SET target_observation = @status,
          target_fingerprint = @fingerprint,
          target_observed_at = @observedAt,
          updated_at = CASE
            WHEN target_observation != @status
              OR target_fingerprint IS NOT @fingerprint
            THEN MAX(updated_at, @observedAt)
            ELSE updated_at
          END
      WHERE id = @installationId AND uninstalled_at IS NULL
    `).run({
      installationId,
      status: parsedObservation.status,
      fingerprint,
      observedAt: parsedObservation.observedAt,
    });
    if (result.changes !== 1) {
      throw new SkillOperationError('not-found', 'Skill Installation was not found.');
    }
    return this.getActiveById(installationId);
  }

  private insertInstallation(input: {
    installationId: string;
    packageId: string;
    targetId: string;
    distributionName: string;
    relativePath: string;
    fingerprint: string;
    observedAt: number;
  }): SkillInstallationMetadata {
    this.database.prepare(`
      INSERT INTO skill_installations (
        id,
        package_id,
        target_id,
        distribution_name,
        normalized_distribution_name,
        relative_path,
        relative_path_key,
        target_observation,
        target_fingerprint,
        target_observed_at,
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
        'available',
        @fingerprint,
        @observedAt,
        @observedAt,
        @observedAt
      )
    `).run({
      ...input,
      normalizedDistributionName: normalizeSkillDistributionName(input.distributionName),
      relativePathKey: normalizeSkillRelativePath(input.relativePath),
    });
    return this.getActiveById(input.installationId);
  }

  findActiveInstallationByLocation(
    targetIdValue: unknown,
    relativePathValue: unknown,
  ): SkillInstallationMetadata | null {
    return this.execute(() => {
      const targetId = parseSkillTargetId(targetIdValue);
      const relativePath = parseSkillRelativePath(relativePathValue);
      const row = this.selectActiveByLocation(
        targetId,
        normalizeSkillRelativePath(relativePath),
      );
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
    return this.execute(() => this.getActiveById(
      parseSkillInstallationId(installationIdValue),
    ));
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

  countActiveInstallationsForPackage(packageIdValue: unknown): number {
    return this.execute(() => this.database.prepare<[string], number>(`
      SELECT COUNT(*) FROM skill_installations
      WHERE package_id = ? AND uninstalled_at IS NULL
    `).pluck().get(parseSkillId(packageIdValue)) ?? 0);
  }

  getLatestDistributionRecord(
    installationIdValue: unknown,
  ): SkillDistributionRecordMetadata | null {
    return this.execute(() => {
      const installationId = parseSkillInstallationId(installationIdValue);
      this.getActiveById(installationId);
      const row = this.database.prepare<[string], SkillDistributionRecordRow>(`
        SELECT * FROM skill_distribution_records
        WHERE installation_id = ?
        ORDER BY sequence_number DESC
        LIMIT 1
      `).get(installationId);
      return row ? this.mapDistributionRecord(row) : null;
    });
  }

  findDistributionRecordById(
    distributionRecordIdValue: unknown,
  ): SkillDistributionRecordMetadata | null {
    return this.execute(() => {
      const distributionRecordId = parseSkillDistributionRecordId(
        distributionRecordIdValue,
      );
      const row = this.database.prepare<[string], SkillDistributionRecordRow>(`
        SELECT * FROM skill_distribution_records WHERE id = ?
      `).get(distributionRecordId);
      return row ? this.mapDistributionRecord(row) : null;
    });
  }

  adoptInstallation(input: AdoptSkillInstallationInput): AdoptSkillInstallationResult {
    return this.execute(() => {
      const packageId = parseSkillId(input.packageId);
      const targetId = parseSkillTargetId(input.targetId);
      const revisionId = parseSkillRevisionId(input.revisionId);
      const distributionName = parseSkillDistributionName(input.distributionName);
      const relativePath = parseSkillRelativePath(input.relativePath);
      const fingerprint = parseSkillContentFingerprint(input.fingerprint);
      const observedAt = parseTimestamp(input.observedAt);
      return this.database.transaction(() => {
        const existing = this.selectActiveByLocation(
          targetId,
          normalizeSkillRelativePath(relativePath),
        );
        if (existing) {
          const installation = this.updateObservationInternal(
            existing.id,
            { status: 'available', fingerprint, observedAt },
          );
          return { installation, distributionRecord: null, reused: true as const };
        }

        const installationId = parseSkillInstallationId(this.createId());
        const distributionRecordId = parseSkillDistributionRecordId(this.createId());
        this.database.prepare(`
          INSERT INTO skill_installations (
            id,
            package_id,
            target_id,
            distribution_name,
            normalized_distribution_name,
            relative_path,
            relative_path_key,
            target_observation,
            target_fingerprint,
            target_observed_at,
            created_at,
            updated_at
          ) VALUES (
            @id,
            @packageId,
            @targetId,
            @distributionName,
            @normalizedDistributionName,
            @relativePath,
            @relativePathKey,
            'available',
            @fingerprint,
            @observedAt,
            @observedAt,
            @observedAt
          )
        `).run({
          id: installationId,
          packageId,
          targetId,
          distributionName,
          normalizedDistributionName: normalizeSkillDistributionName(distributionName),
          relativePath,
          relativePathKey: normalizeSkillRelativePath(relativePath),
          fingerprint,
          observedAt,
        });
        this.database.prepare(`
          INSERT INTO skill_distribution_records (
            id,
            installation_id,
            package_id,
            revision_id,
            sequence_number,
            operation,
            fingerprint,
            created_at
          ) VALUES (
            @id,
            @installationId,
            @packageId,
            @revisionId,
            1,
            'adoption',
            @fingerprint,
            @observedAt
          )
        `).run({
          id: distributionRecordId,
          installationId,
          packageId,
          revisionId,
          fingerprint,
          observedAt,
        });
        return {
          installation: this.getActiveById(installationId),
          distributionRecord: this.getDistributionRecord(distributionRecordId),
          reused: false as const,
        };
      }).immediate();
    });
  }

  recordDistribution(input: RecordSkillDistributionInput): RecordSkillDistributionResult {
    return this.execute(() => {
      const installationId = parseSkillInstallationId(input.installationId);
      const distributionRecordId = parseSkillDistributionRecordId(
        input.distributionRecordId,
      );
      const packageId = parseSkillId(input.packageId);
      const targetId = parseSkillTargetId(input.targetId);
      const revisionId = parseSkillRevisionId(input.revisionId);
      const distributionName = parseSkillDistributionName(input.distributionName);
      const relativePath = parseSkillRelativePath(input.relativePath);
      const fingerprint = parseSkillContentFingerprint(input.fingerprint);
      const observedAt = parseTimestamp(input.observedAt);
      return this.database.transaction(() => {
        const existingAtLocation = this.selectActiveByLocation(
          targetId,
          normalizeSkillRelativePath(relativePath),
        );
        let installation: SkillInstallationMetadata;
        let isCreated = false;
        if (existingAtLocation) {
          installation = this.mapInstallation(existingAtLocation);
          const canReuse = installation.id === installationId
            && installation.packageId === packageId
            && normalizeSkillDistributionName(installation.distributionName)
            === normalizeSkillDistributionName(distributionName);
          if (canReuse) {
            installation = this.updateObservationInternal(
              installationId,
              { status: 'available', fingerprint, observedAt },
            );
          } else if (installation.id === installationId) {
            throw new SkillOperationError(
              'conflict',
              'The Skill Installation identity does not match the synchronized content.',
            );
          } else {
            if (this.selectActiveById(installationId)) {
              throw new SkillOperationError(
                'conflict',
                'Skill Installation identity is occupied.',
              );
            }
            this.database.prepare(`
              UPDATE skill_installations
              SET uninstalled_at = @observedAt,
                  updated_at = MAX(updated_at, @observedAt)
              WHERE id = @existingId AND uninstalled_at IS NULL
            `).run({ existingId: installation.id, observedAt });
            installation = this.insertInstallation({
              installationId,
              packageId,
              targetId,
              distributionName,
              relativePath,
              fingerprint,
              observedAt,
            });
            isCreated = true;
          }
        } else {
          if (this.selectActiveById(installationId)) {
            throw new SkillOperationError('conflict', 'Skill Installation identity is occupied.');
          }
          installation = this.insertInstallation({
            installationId,
            packageId,
            targetId,
            distributionName,
            relativePath,
            fingerprint,
            observedAt,
          });
          isCreated = true;
        }

        const sequenceNumber = this.database.prepare<[string], number>(`
          SELECT COALESCE(MAX(sequence_number), 0) + 1
          FROM skill_distribution_records
          WHERE installation_id = ?
        `).pluck().get(installationId);
        this.database.prepare(`
          INSERT INTO skill_distribution_records (
            id,
            installation_id,
            package_id,
            revision_id,
            sequence_number,
            operation,
            fingerprint,
            created_at
          ) VALUES (
            @id,
            @installationId,
            @packageId,
            @revisionId,
            @sequenceNumber,
            @operation,
            @fingerprint,
            @observedAt
          )
        `).run({
          id: distributionRecordId,
          installationId,
          packageId,
          revisionId,
          sequenceNumber,
          operation: input.operation,
          fingerprint,
          observedAt,
        });
        return {
          installation,
          distributionRecord: this.getDistributionRecord(distributionRecordId),
          created: isCreated,
        };
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
      const result = this.database.prepare(`
        UPDATE skill_installations
        SET uninstalled_at = @uninstalledAt,
            updated_at = MAX(updated_at, @uninstalledAt)
        WHERE id = @installationId AND uninstalled_at IS NULL
      `).run({ installationId, uninstalledAt });
      if (result.changes !== 1) {
        throw new SkillOperationError('not-found', 'Skill Installation was not found.');
      }
      return installation;
    });
  }

  updateInstallationObservation(
    installationIdValue: unknown,
    observation: SkillContentObservation,
  ): SkillInstallationMetadata {
    return this.execute(() => this.updateObservationInternal(
      parseSkillInstallationId(installationIdValue),
      observation,
    ));
  }

  markMissingInstallations(
    targetIdValue: unknown,
    observedRelativePaths: ReadonlySet<string>,
    observedAtValue: unknown = this.now(),
  ): SkillInstallationMetadata[] {
    return this.execute(() => {
      const targetId = parseSkillTargetId(targetIdValue);
      const observedAt = parseTimestamp(observedAtValue);
      return this.listActiveInstallations(targetId)
        .filter((installation) => !observedRelativePaths.has(
          normalizeSkillRelativePath(installation.relativePath),
        ))
        .map((installation) => this.updateObservationInternal(
          installation.id,
          { status: 'missing', observedAt },
        ));
    });
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

function parseStoredId(value: unknown, parse: (input: unknown) => string): string {
  try {
    return parse(value);
  } catch {
    throw storedInstallationError();
  }
}

function parseStoredDistributionName(value: unknown): string {
  try {
    return parseSkillDistributionName(value);
  } catch {
    throw storedInstallationError();
  }
}

function parseStoredRelativePath(value: unknown): string {
  try {
    return parseSkillRelativePath(value);
  } catch {
    throw storedInstallationError();
  }
}

function parseStoredFingerprint(value: unknown): string {
  try {
    return parseSkillContentFingerprint(value);
  } catch {
    throw storedInstallationError();
  }
}

function storedInstallationError(): SkillOperationError {
  return new SkillOperationError('storage-corrupt', 'Stored Skill Installation data is invalid.');
}
