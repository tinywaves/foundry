import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import type Database from 'better-sqlite3';
import type {
  CreateProviderInput,
  ProviderAvatar,
  ProviderConnectionSummary,
  ProviderConnectionStatus,
  ProviderDetail,
  ProviderRuntime,
  ProviderSource,
  ProviderSummary,
} from '../../shared/provider-contract';
import {
  providerConnectionStatuses,
  providerRuntimes,
  providerSources,
} from '../../shared/provider-contract';
import { ProviderOperationError, invalidProviderField, toProviderOperationError } from './provider-error';
import {
  parseCreateProviderInput,
  parseProviderConnectionTestInput,
  parseProviderId,
  parseProviderRuntime,
  parseStoredAvatar,
  parseStoredModelConfig,
  parseUpdateProviderInput,
} from './provider-validation';

interface ProviderSummaryRow {
  id: string;
  runtime: ProviderRuntime;
  provider_source: ProviderSource;
  name: string;
  base_url: string;
  remark: string | null;
  official_website: string | null;
  has_api_key: number;
  api_key_suffix: string | null;
  has_custom_avatar: number;
  model_config_version: number;
  model_config_json: string;
  connection_status: ProviderConnectionStatus;
  last_tested_at: number | null;
  last_test_error: string | null;
  created_at: number;
  updated_at: number;
}

interface ProviderDetailRow extends ProviderSummaryRow {
  api_key: string | null;
}

interface ProviderAvatarRow {
  avatar_mime_type: ProviderAvatar['mimeType'] | null;
  avatar_data: Buffer | null;
}

interface ExistingProviderRow extends ProviderAvatarRow {
  runtime: ProviderRuntime;
  base_url: string;
  api_key: string | null;
  model_config_version: number;
  model_config_json: string;
}

export interface ProviderConnectionIdentity {
  baseUrl: string;
  apiKey: string | null;
  modelConfigVersion: number;
  modelConfigJson: string;
}

export interface ProviderConnectionTarget extends ProviderConnectionIdentity {
  id: string;
  runtime: ProviderRuntime;
}

const summaryColumns = `
  id,
  runtime,
  provider_source,
  name,
  base_url,
  remark,
  official_website,
  CASE WHEN api_key IS NULL THEN 0 ELSE 1 END AS has_api_key,
  CASE WHEN api_key IS NULL THEN NULL ELSE substr(api_key, -4) END AS api_key_suffix,
  CASE WHEN avatar_data IS NULL THEN 0 ELSE 1 END AS has_custom_avatar,
  model_config_version,
  model_config_json,
  connection_status,
  last_tested_at,
  last_test_error,
  created_at,
  updated_at
`;

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1F || codePoint === 0x7F) {
      return true;
    }
  }
  return false;
}

function assertTestedConnectionSummary(summary: ProviderConnectionSummary): void {
  const hasValidTimestamp = summary.lastTestedAt !== null
    && Number.isSafeInteger(summary.lastTestedAt)
    && summary.lastTestedAt >= 0;
  const isConnected = summary.status === 'connected' && summary.lastError === null;
  const isFailed = summary.status === 'failed'
    && typeof summary.lastError === 'string'
    && summary.lastError.length > 0
    && summary.lastError.length <= 160
    && !hasControlCharacters(summary.lastError);
  if (!hasValidTimestamp || (!isConnected && !isFailed)) {
    throw new ProviderOperationError('internal', 'The connection result was invalid.');
  }
}

export class ProviderRepository {
  constructor(private readonly database: Database.Database) {}

  private getExistingProvider(id: string): ExistingProviderRow {
    const row = this.database.prepare<[string], ExistingProviderRow>(`
      SELECT runtime, base_url, api_key, avatar_mime_type, avatar_data,
             model_config_version, model_config_json
      FROM providers
      WHERE id = ? AND deleted_at IS NULL
    `).get(id);
    if (!row) {
      throw new ProviderOperationError('not-found', 'Provider was not found.');
    }
    if (!providerRuntimes.includes(row.runtime)) {
      throw new ProviderOperationError('storage-corrupt', 'Stored Provider runtime is invalid.');
    }
    if (row.api_key !== null && typeof row.api_key !== 'string') {
      throw new ProviderOperationError('storage-corrupt', 'Stored Provider API key is invalid.');
    }
    try {
      parseProviderConnectionTestInput({
        runtime: row.runtime,
        baseUrl: row.base_url,
        apiKey: row.api_key,
      });
      parseStoredModelConfig(row.runtime, row.model_config_version, row.model_config_json);
      parseStoredAvatar(row.avatar_mime_type, row.avatar_data);
    } catch {
      throw new ProviderOperationError('storage-corrupt', 'Stored Provider data is invalid.');
    }
    return row;
  }

  private getSummaryById(id: string): ProviderSummary {
    const row = this.database.prepare<[string], ProviderSummaryRow>(`
      SELECT ${summaryColumns}
      FROM providers
      WHERE id = ? AND deleted_at IS NULL
    `).get(id);
    if (!row) {
      throw new ProviderOperationError('not-found', 'Provider was not found.');
    }
    return this.mapSummary(row);
  }

  private mapSummary(row: ProviderSummaryRow): ProviderSummary {
    if (!providerRuntimes.includes(row.runtime)) {
      throw new ProviderOperationError('storage-corrupt', 'Stored Provider runtime is invalid.');
    }
    if (!providerSources.includes(row.provider_source)) {
      throw new ProviderOperationError('storage-corrupt', 'Stored Provider source is invalid.');
    }
    if (!providerConnectionStatuses.includes(row.connection_status)) {
      throw new ProviderOperationError('storage-corrupt', 'Stored Provider status is invalid.');
    }
    this.assertStoredSummaryValues(row);
    return {
      id: row.id,
      runtime: row.runtime,
      source: row.provider_source,
      name: row.name,
      baseUrl: row.base_url,
      remark: row.remark,
      officialWebsite: row.official_website,
      hasApiKey: row.has_api_key === 1,
      apiKeySuffix: row.api_key_suffix,
      hasCustomAvatar: row.has_custom_avatar === 1,
      connection: {
        status: row.connection_status,
        lastTestedAt: row.last_tested_at,
        lastError: row.last_test_error,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private assertStoredSummaryValues(row: ProviderSummaryRow): void {
    const hasValidStrings = [
      row.id,
      row.name,
      row.base_url,
      row.model_config_json,
    ].every((value) => typeof value === 'string');
    const hasValidNullableStrings = [
      row.remark,
      row.official_website,
      row.api_key_suffix,
      row.last_test_error,
    ].every(isNullableString);
    const hasValidFlags = [row.has_api_key, row.has_custom_avatar]
      .every((value) => value === 0 || value === 1);
    const hasValidTimestamps = [row.created_at, row.updated_at]
      .every((value) => Number.isSafeInteger(value) && value >= 0);
    const hasValidLastTestedAt = row.last_tested_at === null
      || (Number.isSafeInteger(row.last_tested_at) && row.last_tested_at >= 0);
    const hasValidConnectionSummary = (
      row.connection_status === 'never-tested'
      && row.last_tested_at === null
      && row.last_test_error === null
    ) || (
      row.connection_status === 'connected'
      && row.last_tested_at !== null
      && row.last_test_error === null
    ) || (
      row.connection_status === 'failed'
      && row.last_tested_at !== null
      && row.last_test_error !== null
    );

    if (
      !hasValidStrings
      || !hasValidNullableStrings
      || !hasValidFlags
      || !hasValidTimestamps
      || !hasValidLastTestedAt
      || !hasValidConnectionSummary
      || !Number.isSafeInteger(row.model_config_version)
      || row.name.trim() === ''
    ) {
      throw new ProviderOperationError('storage-corrupt', 'Stored Provider data is invalid.');
    }

    try {
      parseProviderId(row.id);
      const modelConfig = parseStoredModelConfig(
        row.runtime,
        row.model_config_version,
        row.model_config_json,
      );
      const normalized = parseCreateProviderInput({
        runtime: row.runtime,
        name: row.name,
        baseUrl: row.base_url,
        apiKey: null,
        remark: row.remark,
        officialWebsite: row.official_website,
        modelConfig,
      });
      const hasMatchingCommonValues = normalized.name === row.name
        && normalized.baseUrl === row.base_url
        && normalized.remark === row.remark
        && normalized.officialWebsite === row.official_website;
      const hasMatchingKeySummary = (
        row.has_api_key === 0 && row.api_key_suffix === null
      ) || (
        row.has_api_key === 1
        && row.api_key_suffix !== null
        && row.api_key_suffix.length > 0
      );
      if (!hasMatchingCommonValues || !hasMatchingKeySummary) {
        throw new Error('Stored values are not normalized.');
      }
    } catch {
      throw new ProviderOperationError('storage-corrupt', 'Stored Provider data is invalid.');
    }
  }

  private execute<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw toProviderOperationError(error);
    }
  }

  private insertProvider(id: string, now: number, input: CreateProviderInput): void {
    this.database.prepare(`
      INSERT INTO providers (
        id, runtime, provider_source, name, base_url, api_key, remark, official_website,
        avatar_mime_type, avatar_data, model_config_version, model_config_json,
        connection_status, created_at, updated_at
      ) VALUES (
        @id, @runtime, 'user-custom', @name, @baseUrl, @apiKey, @remark, @officialWebsite,
        @avatarMimeType, @avatarData, @modelConfigVersion, @modelConfigJson,
        'never-tested', @createdAt, @updatedAt
      )
    `).run({
      id,
      runtime: input.runtime,
      name: input.name,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      remark: input.remark,
      officialWebsite: input.officialWebsite,
      avatarMimeType: input.avatar?.mimeType ?? null,
      avatarData: input.avatar ? Buffer.from(input.avatar.bytes) : null,
      modelConfigVersion: input.modelConfig.version,
      modelConfigJson: JSON.stringify(input.modelConfig),
      createdAt: now,
      updatedAt: now,
    });
  }

  listProviders(runtimeInput: unknown): ProviderSummary[] {
    return this.execute(() => {
      const runtime = parseProviderRuntime(runtimeInput);
      const rows = this.database.prepare<[ProviderRuntime], ProviderSummaryRow>(`
        SELECT ${summaryColumns}
        FROM providers
        WHERE runtime = ? AND deleted_at IS NULL
        ORDER BY created_at DESC
      `).all(runtime);
      return rows.map((row) => this.mapSummary(row));
    });
  }

  getProviderForEdit(idInput: unknown): ProviderDetail {
    return this.execute(() => {
      const id = parseProviderId(idInput);
      const row = this.database.prepare<[string], ProviderDetailRow>(`
        SELECT ${summaryColumns}, api_key
        FROM providers
        WHERE id = ? AND deleted_at IS NULL
      `).get(id);
      if (!row) {
        throw new ProviderOperationError('not-found', 'Provider was not found.');
      }
      if (row.api_key !== null && typeof row.api_key !== 'string') {
        throw new ProviderOperationError('storage-corrupt', 'Stored Provider API key is invalid.');
      }
      const summary = this.mapSummary(row);
      if (row.runtime === 'codex') {
        return {
          ...summary,
          runtime: row.runtime,
          apiKey: row.api_key,
          modelConfig: parseStoredModelConfig(
            row.runtime,
            row.model_config_version,
            row.model_config_json,
          ),
        };
      }
      return {
        ...summary,
        runtime: row.runtime,
        apiKey: row.api_key,
        modelConfig: parseStoredModelConfig(
          row.runtime,
          row.model_config_version,
          row.model_config_json,
        ),
      };
    });
  }

  getProviderAvatar(idInput: unknown): ProviderAvatar | null {
    return this.execute(() => {
      const id = parseProviderId(idInput);
      const row = this.database.prepare<[string], ProviderAvatarRow>(`
        SELECT avatar_mime_type, avatar_data
        FROM providers
        WHERE id = ? AND deleted_at IS NULL
      `).get(id);
      if (!row) {
        throw new ProviderOperationError('not-found', 'Provider was not found.');
      }
      return parseStoredAvatar(row.avatar_mime_type, row.avatar_data);
    });
  }

  getProviderApiKey(idInput: unknown): string | null {
    return this.execute(() => {
      const id = parseProviderId(idInput);
      const row = this.database.prepare<[string], { api_key: string | null }>(`
        SELECT api_key
        FROM providers
        WHERE id = ? AND deleted_at IS NULL
      `).get(id);
      if (!row) {
        throw new ProviderOperationError('not-found', 'Provider was not found.');
      }
      if (row.api_key !== null && typeof row.api_key !== 'string') {
        throw new ProviderOperationError('storage-corrupt', 'Stored Provider API key is invalid.');
      }
      return row.api_key;
    });
  }

  getProviderConnectionTarget(idInput: unknown): ProviderConnectionTarget {
    return this.execute(() => {
      const id = parseProviderId(idInput);
      const existing = this.getExistingProvider(id);
      return {
        id,
        runtime: existing.runtime,
        baseUrl: existing.base_url,
        apiKey: existing.api_key,
        modelConfigVersion: existing.model_config_version,
        modelConfigJson: existing.model_config_json,
      };
    });
  }

  createProvider(inputValue: unknown): ProviderSummary {
    return this.execute(() => {
      const input = parseCreateProviderInput(inputValue);
      const id = randomUUID();
      const now = Date.now();
      return this.database.transaction(() => {
        this.insertProvider(id, now, input);
        return this.getSummaryById(id);
      }).immediate();
    });
  }

  updateProvider(inputValue: unknown): ProviderSummary {
    return this.execute(() => {
      const input = parseUpdateProviderInput(inputValue);
      return this.database.transaction(() => {
        const existing = this.getExistingProvider(input.id);
        if (existing.runtime !== input.runtime) {
          return invalidProviderField('runtime', 'Provider runtime cannot be changed.');
        }
        const avatar = input.avatar === undefined
          ? existing
          : {
              avatar_mime_type: input.avatar?.mimeType ?? null,
              avatar_data: input.avatar ? Buffer.from(input.avatar.bytes) : null,
            };
        const modelConfigJson = JSON.stringify(input.modelConfig);
        const existingModelConfigJson = JSON.stringify(parseStoredModelConfig(
          existing.runtime,
          existing.model_config_version,
          existing.model_config_json,
        ));
        const hasConnectionChanges = input.baseUrl !== existing.base_url
          || input.apiKey !== existing.api_key
          || modelConfigJson !== existingModelConfigJson;
        const result = this.database.prepare(`
          UPDATE providers
          SET name = @name,
              base_url = @baseUrl,
              api_key = @apiKey,
              remark = @remark,
              official_website = @officialWebsite,
              avatar_mime_type = @avatarMimeType,
              avatar_data = @avatarData,
              model_config_version = @modelConfigVersion,
              model_config_json = @modelConfigJson,
              connection_status = CASE
                WHEN @resetConnection = 1 THEN 'never-tested'
                ELSE connection_status
              END,
              last_tested_at = CASE
                WHEN @resetConnection = 1 THEN NULL
                ELSE last_tested_at
              END,
              last_test_error = CASE
                WHEN @resetConnection = 1 THEN NULL
                ELSE last_test_error
              END,
              updated_at = @updatedAt
          WHERE id = @id AND deleted_at IS NULL
        `).run({
          id: input.id,
          name: input.name,
          baseUrl: input.baseUrl,
          apiKey: input.apiKey,
          remark: input.remark,
          officialWebsite: input.officialWebsite,
          avatarMimeType: avatar.avatar_mime_type,
          avatarData: avatar.avatar_data,
          modelConfigVersion: input.modelConfig.version,
          modelConfigJson,
          resetConnection: hasConnectionChanges ? 1 : 0,
          updatedAt: Date.now(),
        });
        if (result.changes !== 1) {
          throw new ProviderOperationError('not-found', 'Provider was not found.');
        }
        return this.getSummaryById(input.id);
      }).immediate();
    });
  }

  recordProviderConnectionSummary(
    target: ProviderConnectionTarget,
    summary: ProviderConnectionSummary,
  ): ProviderSummary {
    return this.execute(() => {
      const id = parseProviderId(target.id);
      const runtime = parseProviderRuntime(target.runtime);
      assertTestedConnectionSummary(summary);
      return this.database.transaction(() => {
        const result = this.database.prepare(`
          UPDATE providers
          SET connection_status = @status,
              last_tested_at = @lastTestedAt,
              last_test_error = @lastError,
              updated_at = @updatedAt
          WHERE id = @id
            AND runtime = @runtime
            AND base_url = @baseUrl
            AND api_key IS @apiKey
            AND model_config_version = @modelConfigVersion
            AND model_config_json = @modelConfigJson
            AND deleted_at IS NULL
        `).run({
          id,
          runtime,
          baseUrl: target.baseUrl,
          apiKey: target.apiKey,
          modelConfigVersion: target.modelConfigVersion,
          modelConfigJson: target.modelConfigJson,
          status: summary.status,
          lastTestedAt: summary.lastTestedAt,
          lastError: summary.lastError,
          updatedAt: Date.now(),
        });
        if (result.changes === 1) {
          return this.getSummaryById(id);
        }

        const isActive = this.database.prepare<[string], { id: string }>(`
          SELECT id FROM providers WHERE id = ? AND deleted_at IS NULL
        `).get(id);
        if (!isActive) {
          throw new ProviderOperationError('not-found', 'Provider was not found.');
        }
        throw new ProviderOperationError(
          'conflict',
          'Provider connection settings changed while the test was running.',
        );
      }).immediate();
    });
  }

  deleteProvider(idInput: unknown): void {
    this.execute(() => {
      const id = parseProviderId(idInput);
      this.database.transaction(() => {
        const now = Date.now();
        const result = this.database.prepare(`
          UPDATE providers
          SET deleted_at = ?, updated_at = ?
          WHERE id = ? AND deleted_at IS NULL
        `).run(now, now, id);
        if (result.changes !== 1) {
          throw new ProviderOperationError('not-found', 'Provider was not found.');
        }
      }).immediate();
    });
  }
}
