import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type Database from 'better-sqlite3';
import type {
  SkillTargetKind,
  SkillTargetPolicySource,
} from '../../shared/skill-contract';
import { SkillOperationError, toSkillOperationError } from './skill-error';
import type { ResolvedBuiltInSkillTarget } from './skill-target-adapters';
import {
  parseSkillScanDepth,
  parseSkillTargetId,
  parseSkillTargetKind,
  parseSkillTargetPolicyInput,
} from './skill-validation';

interface SkillTargetRow {
  id: string;
  kind: string;
  display_name: string;
  configured_path: string;
  resolved_path: string;
  resolved_path_key: string;
  documentation_url: string | null;
  is_built_in: number;
  is_writable: number;
  is_enabled: number;
  policy_source: string;
  max_scan_depth: number;
  allow_symlink_escape: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

interface SkillTargetRepositoryOptions {
  createId?: () => string;
  now?: () => number;
}

export interface SkillTargetMetadata {
  id: string;
  kind: SkillTargetKind;
  displayName: string;
  configuredPath: string;
  resolvedPath: string;
  resolvedPathKey: string;
  documentationUrl: string | null;
  builtIn: boolean;
  writable: boolean;
  enabled: boolean;
  policySource: SkillTargetPolicySource;
  maxScanDepth: number;
  allowSymlinkEscape: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateCustomSkillTargetInput {
  displayName: string;
  configuredPath: string;
  resolvedPath: string;
  resolvedPathKey: string;
  isWritable: boolean;
  enabled: boolean;
  maxScanDepth: number;
  allowSymlinkEscape: boolean;
}

export interface CreateCustomSkillTargetResult {
  target: SkillTargetMetadata;
  reused: boolean;
}

export class SkillTargetRepository {
  private readonly createId: () => string;
  private readonly now: () => number;

  constructor(
    private readonly database: Database.Database,
    options: SkillTargetRepositoryOptions = {},
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

  private selectById(id: string): SkillTargetRow | undefined {
    return this.database.prepare<[string], SkillTargetRow>(`
      SELECT * FROM skill_targets WHERE id = ? AND removed_at IS NULL
    `).get(id);
  }

  private selectByResolvedPathKey(resolvedPathKey: string): SkillTargetRow | undefined {
    return this.database.prepare<[string], SkillTargetRow>(`
      SELECT * FROM skill_targets
      WHERE resolved_path_key = ? AND removed_at IS NULL
    `).get(resolvedPathKey);
  }

  private selectBuiltInByKind(kind: SkillTargetKind): SkillTargetRow | undefined {
    return this.database.prepare<[string], SkillTargetRow>(`
      SELECT * FROM skill_targets
      WHERE kind = ? AND is_built_in = 1 AND removed_at IS NULL
      ORDER BY created_at, id
      LIMIT 1
    `).get(kind);
  }

  private getById(id: string): SkillTargetMetadata {
    const row = this.selectById(id);
    if (!row) {
      throw new SkillOperationError('not-found', 'Distribution Target was not found.');
    }
    return this.mapTarget(row);
  }

  private mapTarget(row: SkillTargetRow): SkillTargetMetadata {
    const id = parseStoredTargetId(row.id);
    const kind = parseStoredTargetKind(row.kind);
    const isBuiltIn = isStoredBoolean(row.is_built_in);
    if (isBuiltIn === (kind === 'custom')) {
      throw storedTargetError();
    }
    const policySource = parseStoredPolicySource(row.policy_source);
    const createdAt = parseStoredTimestamp(row.created_at);
    const updatedAt = parseStoredTimestamp(row.updated_at);
    if (
      !row.display_name.trim()
      || !path.isAbsolute(row.configured_path)
      || !path.isAbsolute(row.resolved_path)
      || !row.resolved_path_key
      || !Number.isSafeInteger(row.sort_order)
      || row.sort_order < 0
      || updatedAt < createdAt
    ) {
      throw storedTargetError();
    }
    return {
      id,
      kind,
      displayName: row.display_name,
      configuredPath: row.configured_path,
      resolvedPath: row.resolved_path,
      resolvedPathKey: row.resolved_path_key,
      documentationUrl: row.documentation_url,
      builtIn: isBuiltIn,
      writable: isStoredBoolean(row.is_writable),
      enabled: isStoredBoolean(row.is_enabled),
      policySource,
      maxScanDepth: parseStoredScanDepth(row.max_scan_depth),
      allowSymlinkEscape: isStoredBoolean(row.allow_symlink_escape),
      sortOrder: row.sort_order,
      createdAt,
      updatedAt,
    };
  }

  synchronizeBuiltInTargets(
    definitions: readonly ResolvedBuiltInSkillTarget[],
  ): SkillTargetMetadata[] {
    return this.execute(() => this.database.transaction(() => {
      const synchronized: SkillTargetMetadata[] = [];
      for (const definition of definitions) {
        const existing = this.selectBuiltInByKind(definition.kind)
          ?? this.selectByResolvedPathKey(definition.resolvedPathKey);
        const updatedAt = this.now();
        if (!existing) {
          const id = parseSkillTargetId(this.createId());
          this.database.prepare(`
            INSERT INTO skill_targets (
              id,
              kind,
              display_name,
              configured_path,
              resolved_path,
              resolved_path_key,
              documentation_url,
              is_built_in,
              is_writable,
              is_enabled,
              policy_source,
              max_scan_depth,
              allow_symlink_escape,
              sort_order,
              created_at,
              updated_at
            ) VALUES (
              @id,
              @kind,
              @displayName,
              @configuredPath,
              @resolvedPath,
              @resolvedPathKey,
              @documentationUrl,
              1,
              @isWritable,
              1,
              'adapter-default',
              @maxScanDepth,
              @allowSymlinkEscape,
              @sortOrder,
              @updatedAt,
              @updatedAt
            )
          `).run({
            id,
            kind: definition.kind,
            displayName: definition.displayName,
            configuredPath: definition.configuredPath,
            resolvedPath: definition.resolvedPath,
            resolvedPathKey: definition.resolvedPathKey,
            documentationUrl: definition.documentationUrl,
            isWritable: toDatabaseBoolean(definition.isWritable),
            maxScanDepth: parseSkillScanDepth(definition.defaultMaxScanDepth),
            allowSymlinkEscape: toDatabaseBoolean(
              definition.defaultAllowSymlinkEscape,
            ),
            sortOrder: definition.sortOrder,
            updatedAt,
          });
          synchronized.push(this.getById(id));
          continue;
        }

        this.database.prepare(`
          UPDATE skill_targets
          SET kind = @kind,
              display_name = @displayName,
              configured_path = @configuredPath,
              resolved_path = @resolvedPath,
              resolved_path_key = @resolvedPathKey,
              documentation_url = @documentationUrl,
              is_built_in = 1,
              is_writable = @isWritable,
              is_enabled = CASE
                WHEN policy_source = 'adapter-default' THEN 1
                ELSE is_enabled
              END,
              max_scan_depth = CASE
                WHEN policy_source = 'adapter-default' THEN @maxScanDepth
                ELSE max_scan_depth
              END,
              allow_symlink_escape = CASE
                WHEN policy_source = 'adapter-default' THEN @allowSymlinkEscape
                ELSE allow_symlink_escape
              END,
              sort_order = @sortOrder,
              updated_at = @updatedAt
          WHERE id = @id AND removed_at IS NULL
        `).run({
          id: existing.id,
          kind: definition.kind,
          displayName: definition.displayName,
          configuredPath: definition.configuredPath,
          resolvedPath: definition.resolvedPath,
          resolvedPathKey: definition.resolvedPathKey,
          documentationUrl: definition.documentationUrl,
          isWritable: toDatabaseBoolean(definition.isWritable),
          maxScanDepth: parseSkillScanDepth(definition.defaultMaxScanDepth),
          allowSymlinkEscape: toDatabaseBoolean(definition.defaultAllowSymlinkEscape),
          sortOrder: definition.sortOrder,
          updatedAt,
        });
        synchronized.push(this.getById(existing.id));
      }
      return synchronized;
    }).immediate());
  }

  listTargets(): SkillTargetMetadata[] {
    return this.execute(() => this.database.prepare<[], SkillTargetRow>(`
      SELECT * FROM skill_targets
      WHERE removed_at IS NULL
      ORDER BY sort_order, display_name, id
    `).all().map((row) => this.mapTarget(row)));
  }

  getTarget(targetIdValue: unknown): SkillTargetMetadata {
    return this.execute(() => this.getById(parseSkillTargetId(targetIdValue)));
  }

  updateTargetPolicy(inputValue: unknown): SkillTargetMetadata {
    return this.execute(() => {
      const input = parseSkillTargetPolicyInput(inputValue);
      const result = this.database.prepare(`
        UPDATE skill_targets
        SET is_enabled = @isEnabled,
            max_scan_depth = @maxScanDepth,
            allow_symlink_escape = @allowSymlinkEscape,
            policy_source = 'user-override',
            updated_at = @updatedAt
        WHERE id = @targetId AND removed_at IS NULL
      `).run({
        targetId: input.targetId,
        isEnabled: toDatabaseBoolean(input.enabled),
        maxScanDepth: input.maxScanDepth,
        allowSymlinkEscape: toDatabaseBoolean(input.allowSymlinkEscape),
        updatedAt: this.now(),
      });
      if (result.changes !== 1) {
        throw new SkillOperationError('not-found', 'Distribution Target was not found.');
      }
      return this.getById(input.targetId);
    });
  }

  resetBuiltInTargetPolicy(
    targetIdValue: unknown,
    definition: ResolvedBuiltInSkillTarget,
  ): SkillTargetMetadata {
    return this.execute(() => {
      const targetId = parseSkillTargetId(targetIdValue);
      const existing = this.selectById(targetId);
      if (existing?.is_built_in !== 1 || existing.kind !== definition.kind) {
        throw new SkillOperationError('not-found', 'Built-in Distribution Target was not found.');
      }
      this.database.prepare(`
        UPDATE skill_targets
        SET is_enabled = 1,
            max_scan_depth = @maxScanDepth,
            allow_symlink_escape = @allowSymlinkEscape,
            policy_source = 'adapter-default',
            updated_at = @updatedAt
        WHERE id = @targetId AND is_built_in = 1 AND removed_at IS NULL
      `).run({
        targetId,
        maxScanDepth: parseSkillScanDepth(definition.defaultMaxScanDepth),
        allowSymlinkEscape: toDatabaseBoolean(definition.defaultAllowSymlinkEscape),
        updatedAt: this.now(),
      });
      return this.getById(targetId);
    });
  }

  createCustomTarget(input: CreateCustomSkillTargetInput): CreateCustomSkillTargetResult {
    return this.execute(() => {
      const parsed = parseCustomTargetInput(input);
      const existing = this.selectByResolvedPathKey(parsed.resolvedPathKey);
      if (existing) {
        return { target: this.mapTarget(existing), reused: true };
      }
      const id = parseSkillTargetId(this.createId());
      const now = this.now();
      this.database.prepare(`
        INSERT INTO skill_targets (
          id,
          kind,
          display_name,
          configured_path,
          resolved_path,
          resolved_path_key,
          documentation_url,
          is_built_in,
          is_writable,
          is_enabled,
          policy_source,
          max_scan_depth,
          allow_symlink_escape,
          sort_order,
          created_at,
          updated_at
        ) VALUES (
          @id,
          'custom',
          @displayName,
          @configuredPath,
          @resolvedPath,
          @resolvedPathKey,
          NULL,
          0,
          @isWritable,
          @isEnabled,
          'user-override',
          @maxScanDepth,
          @allowSymlinkEscape,
          500,
          @now,
          @now
        )
      `).run({
        id,
        displayName: parsed.displayName,
        configuredPath: parsed.configuredPath,
        resolvedPath: parsed.resolvedPath,
        resolvedPathKey: parsed.resolvedPathKey,
        isWritable: toDatabaseBoolean(parsed.isWritable),
        isEnabled: toDatabaseBoolean(parsed.enabled),
        maxScanDepth: parsed.maxScanDepth,
        allowSymlinkEscape: toDatabaseBoolean(parsed.allowSymlinkEscape),
        now,
      });
      return { target: this.getById(id), reused: false };
    });
  }

  removeCustomTarget(targetIdValue: unknown): void {
    this.execute(() => {
      const targetId = parseSkillTargetId(targetIdValue);
      const target = this.selectById(targetId);
      if (target?.is_built_in !== 0 || target.kind !== 'custom') {
        throw new SkillOperationError('not-found', 'Custom Distribution Target was not found.');
      }
      const installationCount = this.database.prepare<[string], number>(`
        SELECT COUNT(*) FROM skill_installations
        WHERE target_id = ? AND uninstalled_at IS NULL
      `).pluck().get(targetId) ?? 0;
      if (installationCount > 0) {
        throw new SkillOperationError(
          'conflict',
          'Remove active Skill Installations before removing this Distribution Target.',
        );
      }
      this.database.prepare(`
        UPDATE skill_targets SET removed_at = @removedAt, updated_at = @removedAt
        WHERE id = @targetId AND is_built_in = 0 AND removed_at IS NULL
      `).run({ targetId, removedAt: this.now() });
    });
  }
}

function parseCustomTargetInput(
  input: CreateCustomSkillTargetInput,
): CreateCustomSkillTargetInput {
  if (
    !input.displayName.trim()
    || !path.isAbsolute(input.configuredPath)
    || !path.isAbsolute(input.resolvedPath)
    || !input.resolvedPathKey
    || typeof input.isWritable !== 'boolean'
    || typeof input.enabled !== 'boolean'
    || typeof input.allowSymlinkEscape !== 'boolean'
  ) {
    throw new SkillOperationError('invalid-input', 'Custom Distribution Target is invalid.');
  }
  return { ...input, maxScanDepth: parseSkillScanDepth(input.maxScanDepth) };
}

function toDatabaseBoolean(isEnabled: boolean): number {
  return isEnabled ? 1 : 0;
}

function isStoredBoolean(value: unknown): boolean {
  if (value !== 0 && value !== 1) {
    throw storedTargetError();
  }
  return value === 1;
}

function parseStoredTargetId(value: unknown): string {
  try {
    return parseSkillTargetId(value);
  } catch {
    throw storedTargetError();
  }
}

function parseStoredTargetKind(value: unknown): SkillTargetKind {
  try {
    return parseSkillTargetKind(value);
  } catch {
    throw storedTargetError();
  }
}

function parseStoredScanDepth(value: unknown): number {
  try {
    return parseSkillScanDepth(value);
  } catch {
    throw storedTargetError();
  }
}

function parseStoredPolicySource(value: unknown): SkillTargetPolicySource {
  if (value !== 'adapter-default' && value !== 'user-override') {
    throw storedTargetError();
  }
  return value;
}

function parseStoredTimestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw storedTargetError();
  }
  return value;
}

function storedTargetError(): SkillOperationError {
  return new SkillOperationError('storage-corrupt', 'Stored Distribution Target data is invalid.');
}
