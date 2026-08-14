import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
  CreatePromptInput,
  PromptDetail,
  PromptSummary,
  PromptVersionDetail,
  PromptVersionSummary,
  TrashedPromptDetail,
  TrashedPromptSummary,
} from '../../shared/prompt-contract';
import { PromptOperationError, toPromptOperationError } from './prompt-error';
import {
  parseCreatePromptInput,
  parsePromptId,
  parsePromptVersionTarget,
  parseStoredPromptSnapshot,
  parseUpdatePromptInput,
} from './prompt-validation';

interface CurrentPromptRow {
  id: string;
  created_at: number;
  updated_at: number;
  trashed_at: number | null;
  removed_at: number | null;
  current_version: number | null;
  title: string | null;
  description: string | null;
  content: string | null;
  version_created_at: number | null;
}

interface PromptVersionRow {
  prompt_id: string;
  version_number: number;
  title: string;
  description: string | null;
  content: string;
  created_at: number;
}

interface PromptVersionMetadataRow {
  prompt_id: string;
  version_number: number;
  created_at: number;
}

type PromptLifecycle = 'active' | 'trash';

const currentPromptColumns = `
  prompts.id,
  prompts.created_at,
  prompts.updated_at,
  prompts.trashed_at,
  prompts.removed_at,
  current_version.version_number AS current_version,
  current_version.title,
  current_version.description,
  current_version.content,
  current_version.created_at AS version_created_at
`;

const currentPromptJoin = `
  LEFT JOIN prompt_versions AS current_version
    ON current_version.prompt_id = prompts.id
    AND current_version.version_number = (
      SELECT MAX(candidate.version_number)
      FROM prompt_versions AS candidate
      WHERE candidate.prompt_id = prompts.id
    )
`;

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function nextTimestamp(previous: number): number {
  return Math.max(Date.now(), previous + 1);
}

export class PromptRepository {
  constructor(private readonly database: Database.Database) {}

  private execute<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw toPromptOperationError(error);
    }
  }

  private getCurrentRow(id: string, lifecycle: PromptLifecycle): CurrentPromptRow {
    const lifecycleCondition = lifecycle === 'active'
      ? 'prompts.trashed_at IS NULL AND prompts.removed_at IS NULL'
      : 'prompts.trashed_at IS NOT NULL AND prompts.removed_at IS NULL';
    const row = this.database.prepare<[string], CurrentPromptRow>(`
      SELECT ${currentPromptColumns}
      FROM prompts
      ${currentPromptJoin}
      WHERE prompts.id = ? AND ${lifecycleCondition}
    `).get(id);
    if (!row) {
      throw new PromptOperationError('not-found', 'Prompt was not found.');
    }
    return row;
  }

  private mapCurrentDetail(row: CurrentPromptRow, lifecycle: PromptLifecycle): PromptDetail {
    this.assertCurrentRow(row, lifecycle);
    const snapshot = parseStoredPromptSnapshot(row.title, row.description, row.content);
    return {
      id: row.id,
      ...snapshot,
      currentVersion: row.current_version!,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTrashedDetail(row: CurrentPromptRow): TrashedPromptDetail {
    const detail = this.mapCurrentDetail(row, 'trash');
    return {
      ...detail,
      trashedAt: row.trashed_at!,
    };
  }

  private assertCurrentRow(row: CurrentPromptRow, lifecycle: PromptLifecycle): void {
    try {
      parsePromptId(row.id);
    } catch {
      throw new PromptOperationError('storage-corrupt', 'Stored Prompt data is invalid.');
    }

    const hasValidBaseTimestamps = isTimestamp(row.created_at)
      && isTimestamp(row.updated_at)
      && row.updated_at >= row.created_at;
    const hasValidVersion = typeof row.current_version === 'number'
      && Number.isSafeInteger(row.current_version)
      && row.current_version > 0
      && isTimestamp(row.version_created_at)
      && row.version_created_at >= row.created_at
      && row.version_created_at <= row.updated_at;
    const hasValidLifecycle = lifecycle === 'active'
      ? row.trashed_at === null && row.removed_at === null
      : isTimestamp(row.trashed_at) && row.removed_at === null;

    if (!hasValidBaseTimestamps || !hasValidVersion || !hasValidLifecycle) {
      throw new PromptOperationError('storage-corrupt', 'Stored Prompt data is invalid.');
    }
  }

  private getActiveDetail(id: string): PromptDetail {
    return this.mapCurrentDetail(this.getCurrentRow(id, 'active'), 'active');
  }

  private getVersionDetail(id: string, version: number): PromptVersionDetail {
    const current = this.mapCurrentDetail(this.getCurrentRow(id, 'active'), 'active');
    const row = this.database.prepare<[string, number], PromptVersionRow>(`
      SELECT prompt_id, version_number, title, description, content, created_at
      FROM prompt_versions
      WHERE prompt_id = ? AND version_number = ?
    `).get(id, version);
    if (!row) {
      throw new PromptOperationError('not-found', 'Prompt version was not found.');
    }
    const detail = this.mapVersionDetail(row);
    if (
      detail.version > current.currentVersion
      || detail.createdAt < current.createdAt
      || detail.createdAt > current.updatedAt
    ) {
      throw new PromptOperationError('storage-corrupt', 'Stored Prompt version is invalid.');
    }
    return detail;
  }

  private mapVersionDetail(row: PromptVersionRow): PromptVersionDetail {
    try {
      parsePromptId(row.prompt_id);
    } catch {
      throw new PromptOperationError('storage-corrupt', 'Stored Prompt version is invalid.');
    }
    if (
      !Number.isSafeInteger(row.version_number)
      || row.version_number < 1
      || !isTimestamp(row.created_at)
    ) {
      throw new PromptOperationError('storage-corrupt', 'Stored Prompt version is invalid.');
    }
    const snapshot = parseStoredPromptSnapshot(row.title, row.description, row.content);
    return {
      promptId: row.prompt_id,
      version: row.version_number,
      createdAt: row.created_at,
      ...snapshot,
    };
  }

  private insertVersion(
    id: string,
    version: number,
    createdAt: number,
    snapshot: CreatePromptInput,
  ): void {
    this.database.prepare(`
      INSERT INTO prompt_versions (
        prompt_id, version_number, title, description, content, created_at
      ) VALUES (
        @promptId, @version, @title, @description, @content, @createdAt
      )
    `).run({
      promptId: id,
      version,
      title: snapshot.title,
      description: snapshot.description,
      content: snapshot.content,
      createdAt,
    });
  }

  listPrompts(): PromptSummary[] {
    return this.execute(() => {
      const rows = this.database.prepare<[], CurrentPromptRow>(`
        SELECT ${currentPromptColumns}
        FROM prompts
        ${currentPromptJoin}
        WHERE prompts.trashed_at IS NULL AND prompts.removed_at IS NULL
        ORDER BY prompts.updated_at DESC, prompts.id
      `).all();
      return rows.map((row) => {
        const { content: _content, ...summary } = this.mapCurrentDetail(row, 'active');
        return summary;
      });
    });
  }

  getPrompt(idValue: unknown): PromptDetail {
    return this.execute(() => this.getActiveDetail(parsePromptId(idValue)));
  }

  createPrompt(inputValue: unknown): PromptDetail {
    return this.execute(() => {
      const input = parseCreatePromptInput(inputValue);
      const id = randomUUID();
      const now = Date.now();
      return this.database.transaction(() => {
        this.database.prepare(`
          INSERT INTO prompts (id, created_at, updated_at)
          VALUES (?, ?, ?)
        `).run(id, now, now);
        this.insertVersion(id, 1, now, input);
        return this.getActiveDetail(id);
      }).immediate();
    });
  }

  updatePrompt(inputValue: unknown): PromptDetail {
    return this.execute(() => {
      const input = parseUpdatePromptInput(inputValue);
      return this.database.transaction(() => {
        const current = this.getActiveDetail(input.id);
        if (
          current.title === input.title
          && current.description === input.description
          && current.content === input.content
        ) {
          return current;
        }

        const updatedAt = nextTimestamp(current.updatedAt);
        this.insertVersion(input.id, current.currentVersion + 1, updatedAt, input);
        const result = this.database.prepare(`
          UPDATE prompts
          SET updated_at = @updatedAt
          WHERE id = @id AND trashed_at IS NULL AND removed_at IS NULL
        `).run({ id: input.id, updatedAt });
        if (result.changes !== 1) {
          throw new PromptOperationError('not-found', 'Prompt was not found.');
        }
        return this.getActiveDetail(input.id);
      }).immediate();
    });
  }

  movePromptToTrash(idValue: unknown): void {
    this.execute(() => {
      const id = parsePromptId(idValue);
      const result = this.database.prepare(`
        UPDATE prompts
        SET trashed_at = @trashedAt
        WHERE id = @id AND trashed_at IS NULL AND removed_at IS NULL
      `).run({ id, trashedAt: Date.now() });
      if (result.changes !== 1) {
        throw new PromptOperationError('not-found', 'Prompt was not found.');
      }
    });
  }

  listPromptVersions(idValue: unknown): PromptVersionSummary[] {
    return this.execute(() => {
      const id = parsePromptId(idValue);
      const current = this.mapCurrentDetail(this.getCurrentRow(id, 'active'), 'active');
      const rows = this.database.prepare<[string], PromptVersionMetadataRow>(`
        SELECT prompt_id, version_number, created_at
        FROM prompt_versions
        WHERE prompt_id = ?
        ORDER BY version_number DESC
      `).all(id);
      if (rows.length !== current.currentVersion) {
        throw new PromptOperationError('storage-corrupt', 'Stored Prompt history is invalid.');
      }
      return rows.map((row, index) => {
        if (
          row.prompt_id !== id
          || row.version_number !== current.currentVersion - index
          || !isTimestamp(row.created_at)
          || row.created_at < current.createdAt
          || row.created_at > current.updatedAt
        ) {
          throw new PromptOperationError('storage-corrupt', 'Stored Prompt version is invalid.');
        }
        return {
          promptId: row.prompt_id,
          version: row.version_number,
          createdAt: row.created_at,
        };
      });
    });
  }

  getPromptVersion(targetValue: unknown): PromptVersionDetail {
    return this.execute(() => {
      const target = parsePromptVersionTarget(targetValue);
      return this.getVersionDetail(target.id, target.version);
    });
  }

  restorePromptVersion(targetValue: unknown): PromptDetail {
    return this.execute(() => {
      const target = parsePromptVersionTarget(targetValue);
      return this.database.transaction(() => {
        const current = this.getActiveDetail(target.id);
        const selected = this.getVersionDetail(target.id, target.version);
        if (selected.version >= current.currentVersion) {
          throw new PromptOperationError(
            'invalid-input',
            'Select a historical Prompt version to restore.',
            [{ field: 'version', message: 'Select a historical Prompt version.' }],
          );
        }
        const updatedAt = nextTimestamp(current.updatedAt);
        this.insertVersion(target.id, current.currentVersion + 1, updatedAt, selected);
        const result = this.database.prepare(`
          UPDATE prompts
          SET updated_at = @updatedAt
          WHERE id = @id AND trashed_at IS NULL AND removed_at IS NULL
        `).run({ id: target.id, updatedAt });
        if (result.changes !== 1) {
          throw new PromptOperationError('not-found', 'Prompt was not found.');
        }
        return this.getActiveDetail(target.id);
      }).immediate();
    });
  }

  listTrashedPrompts(): TrashedPromptSummary[] {
    return this.execute(() => {
      const rows = this.database.prepare<[], CurrentPromptRow>(`
        SELECT ${currentPromptColumns}
        FROM prompts
        ${currentPromptJoin}
        WHERE prompts.trashed_at IS NOT NULL AND prompts.removed_at IS NULL
        ORDER BY prompts.trashed_at DESC, prompts.id
      `).all();
      return rows.map((row) => {
        const detail = this.mapTrashedDetail(row);
        return {
          id: detail.id,
          title: detail.title,
          trashedAt: detail.trashedAt,
        };
      });
    });
  }

  getTrashedPrompt(idValue: unknown): TrashedPromptDetail {
    return this.execute(() => {
      const id = parsePromptId(idValue);
      return this.mapTrashedDetail(this.getCurrentRow(id, 'trash'));
    });
  }

  restoreTrashedPrompt(idValue: unknown): PromptDetail {
    return this.execute(() => {
      const id = parsePromptId(idValue);
      return this.database.transaction(() => {
        this.getCurrentRow(id, 'trash');
        const result = this.database.prepare(`
          UPDATE prompts
          SET trashed_at = NULL
          WHERE id = @id AND trashed_at IS NOT NULL AND removed_at IS NULL
        `).run({ id });
        if (result.changes !== 1) {
          throw new PromptOperationError('not-found', 'Prompt was not found.');
        }
        return this.getActiveDetail(id);
      }).immediate();
    });
  }

  removePromptFromTrash(idValue: unknown): void {
    this.execute(() => {
      const id = parsePromptId(idValue);
      const result = this.database.prepare(`
        UPDATE prompts
        SET removed_at = @removedAt
        WHERE id = @id AND trashed_at IS NOT NULL AND removed_at IS NULL
      `).run({ id, removedAt: Date.now() });
      if (result.changes !== 1) {
        throw new PromptOperationError('not-found', 'Prompt was not found.');
      }
    });
  }

  emptyPromptTrash(): number {
    return this.execute(() => {
      const result = this.database.prepare(`
        UPDATE prompts
        SET removed_at = @removedAt
        WHERE trashed_at IS NOT NULL AND removed_at IS NULL
      `).run({ removedAt: Date.now() });
      return result.changes;
    });
  }
}
