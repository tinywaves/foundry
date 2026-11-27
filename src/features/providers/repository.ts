import { randomUUID } from 'node:crypto';
import type { FoundryStorage } from '../../storage/store';
import type { ProviderRecord } from '../../storage/models';
import { ProviderInUseError } from './contracts';
import type { ProviderConnection, ProviderInput, ProviderListItem, ProviderStatus, ProviderSummary } from './contracts';

export class ProviderNotFoundError extends Error {
  readonly code = 'PROVIDER_NOT_FOUND';
  constructor() {
    super('Provider not found');
    this.name = 'ProviderNotFoundError';
  }
}
export class ProviderRepository {
  constructor(private readonly storage: FoundryStorage) {}
  list(usedProviderIds: ReadonlySet<string> = new Set()): ProviderListItem[] {
    return this.storage.all('providers').filter((row) => row.status !== 'deleted').toSorted((a, b) => b.updatedAt - a.updatedAt).map((row) => ({ ...toSummary(row), isInUse: usedProviderIds.has(row.id) }));
  }

  get(id: string): ProviderSummary | null {
    const row = this.storage.get('providers', id);
    return row ? toSummary(row) : null;
  }

  getConnection(id: string): ProviderConnection | null {
    const row = this.storage.get('providers', id);
    return row && row.status !== 'deleted' ? { protocol: row.protocol, baseURL: row.baseURL, apiKey: row.apiKey } : null;
  }

  save(input: ProviderInput, id?: string): ProviderSummary {
    return this.storage.transaction(() => {
      const existing = id ? this.storage.get('providers', id) : undefined;
      if (id && !existing) {
        throw new ProviderNotFoundError();
      }
      const now = Date.now();
      const row: ProviderRecord = {
        id: id ?? randomUUID(),
        status: 'active',
        createdAt: now,
        deletedAt: null,
        ...existing,
        ...input,
        avatar: input.avatar === undefined ? existing?.avatar ?? null : input.avatar,
        updatedAt: now,
      };
      this.storage.put('providers', row);
      return toSummary(row);
    });
  }

  setStatus(id: string, status: ProviderStatus, usedProviderIds: ReadonlySet<string> = new Set()): ProviderSummary {
    return this.storage.transaction(() => {
      if (usedProviderIds.has(id) && (status === 'disabled' || status === 'deleted')) {
        throw new ProviderInUseError();
      }
      const existing = this.storage.get('providers', id);
      if (!existing) {
        throw new ProviderNotFoundError();
      }
      const now = Date.now();
      const row = {
        ...existing,
        status,
        deletedAt: status === 'deleted' ? now : null,
        updatedAt: now,
      };
      this.storage.put('providers', row);
      return toSummary(row);
    });
  }
}
function toSummary(row: ProviderRecord): ProviderSummary {
  return { ...row, avatar: row.avatar ?? null, status: row.status as ProviderStatus };
}
