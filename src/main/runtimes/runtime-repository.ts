import type Database from 'better-sqlite3';
import type { ProviderRuntime } from '../../shared/provider-contract';
import { providerRuntimes } from '../../shared/provider-contract';
import type { RuntimeSummary } from '../../shared/runtime-contract';
import { RuntimeOperationError, toRuntimeOperationError } from './runtime-error';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RuntimeApplicationRow {
  runtime: string;
  target_kind: string;
  provider_id: string | null;
  applied_at: number;
  stored_provider_id: string | null;
  provider_runtime: string | null;
  provider_deleted_at: number | null;
}

interface ProviderTargetRow {
  runtime: string;
}

export class RuntimeRepository {
  constructor(private readonly database: Database.Database) {}

  private getRuntime(runtime: ProviderRuntime): RuntimeSummary {
    const summary = this.listRuntimes().find((entry) => entry.runtime === runtime);
    if (!summary) {
      throw new RuntimeOperationError('internal', 'The Runtime state could not be read.');
    }
    return summary;
  }

  private mapSummary(row: RuntimeApplicationRow): RuntimeSummary {
    const runtime = parseStoredRuntime(row.runtime);
    if (!Number.isSafeInteger(row.applied_at) || row.applied_at < 0) {
      throw new RuntimeOperationError('storage-corrupt', 'Stored Runtime data is invalid.');
    }

    if (row.target_kind === 'official-default') {
      if (
        row.provider_id !== null
        || row.stored_provider_id !== null
        || row.provider_runtime !== null
        || row.provider_deleted_at !== null
      ) {
        throw new RuntimeOperationError('storage-corrupt', 'Stored Runtime data is invalid.');
      }
      return {
        runtime,
        status: 'official-default',
        providerId: null,
        appliedAt: row.applied_at,
      };
    }

    if (
      row.target_kind !== 'provider'
      || typeof row.provider_id !== 'string'
      || row.stored_provider_id !== row.provider_id
      || row.provider_runtime !== runtime
      || row.provider_deleted_at !== null
    ) {
      throw new RuntimeOperationError('storage-corrupt', 'Stored Runtime data is invalid.');
    }
    parseStoredProviderId(row.provider_id);
    return {
      runtime,
      status: 'provider',
      providerId: row.provider_id,
      appliedAt: row.applied_at,
    };
  }

  private upsertApplication(
    runtime: ProviderRuntime,
    targetKind: 'provider' | 'official-default',
    providerId: string | null,
  ): void {
    this.database.prepare(`
      INSERT INTO runtime_applications (runtime, target_kind, provider_id, applied_at)
      VALUES (@runtime, @targetKind, @providerId, @appliedAt)
      ON CONFLICT (runtime) DO UPDATE SET
        target_kind = excluded.target_kind,
        provider_id = excluded.provider_id,
        applied_at = excluded.applied_at
    `).run({
      runtime,
      targetKind,
      providerId,
      appliedAt: Date.now(),
    });
  }

  private execute<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw toRuntimeOperationError(error);
    }
  }

  listRuntimes(): RuntimeSummary[] {
    return this.execute(() => {
      const rows = this.database.prepare<[], RuntimeApplicationRow>(`
        SELECT
          runtime_applications.runtime,
          runtime_applications.target_kind,
          runtime_applications.provider_id,
          runtime_applications.applied_at,
          providers.id AS stored_provider_id,
          providers.runtime AS provider_runtime,
          providers.deleted_at AS provider_deleted_at
        FROM runtime_applications
        LEFT JOIN providers ON providers.id = runtime_applications.provider_id
      `).all();
      const summaries = new Map<ProviderRuntime, RuntimeSummary>();
      for (const row of rows) {
        const summary = this.mapSummary(row);
        if (summaries.has(summary.runtime)) {
          throw new RuntimeOperationError('storage-corrupt', 'Stored Runtime data is invalid.');
        }
        summaries.set(summary.runtime, summary);
      }

      return providerRuntimes.map((runtime) => summaries.get(runtime) ?? {
        runtime,
        status: 'not-managed',
        providerId: null,
        appliedAt: null,
      });
    });
  }

  recordProviderApplication(runtimeInput: unknown, providerIdInput: unknown): RuntimeSummary {
    return this.execute(() => {
      const runtime = parseRuntime(runtimeInput);
      const providerId = parseProviderId(providerIdInput);
      return this.database.transaction(() => {
        const provider = this.database.prepare<[string], ProviderTargetRow>(`
          SELECT runtime
          FROM providers
          WHERE id = ? AND deleted_at IS NULL
        `).get(providerId);
        if (!provider) {
          throw new RuntimeOperationError('not-found', 'Provider was not found.');
        }
        if (provider.runtime !== runtime) {
          throw new RuntimeOperationError(
            'invalid-input',
            'Provider does not belong to the selected Runtime.',
          );
        }

        this.upsertApplication(runtime, 'provider', providerId);
        return this.getRuntime(runtime);
      }).immediate();
    });
  }

  recordOfficialDefaultApplication(runtimeInput: unknown): RuntimeSummary {
    return this.execute(() => {
      const runtime = parseRuntime(runtimeInput);
      return this.database.transaction(() => {
        this.upsertApplication(runtime, 'official-default', null);
        return this.getRuntime(runtime);
      }).immediate();
    });
  }
}

function parseRuntime(value: unknown): ProviderRuntime {
  if (typeof value !== 'string' || !providerRuntimes.includes(value as ProviderRuntime)) {
    throw new RuntimeOperationError('invalid-input', 'Select a supported Runtime.');
  }
  return value as ProviderRuntime;
}

function parseStoredRuntime(value: unknown): ProviderRuntime {
  try {
    return parseRuntime(value);
  } catch {
    throw new RuntimeOperationError('storage-corrupt', 'Stored Runtime data is invalid.');
  }
}

function parseProviderId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new RuntimeOperationError('invalid-input', 'Provide a valid Provider ID.');
  }
  return value;
}

function parseStoredProviderId(value: unknown): string {
  try {
    return parseProviderId(value);
  } catch {
    throw new RuntimeOperationError('storage-corrupt', 'Stored Runtime data is invalid.');
  }
}
