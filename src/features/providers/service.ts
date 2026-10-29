import { getFoundrySettingsPath } from '../../storage/paths';
import type { FoundryDatabase } from '../../storage/database';
import type {
  ProviderConnection,
  ProviderInput,
  ProviderListItem,
  ProviderStatus,
  ProviderSummary,
  RemoteModel,
} from './contracts';
import {
  fetchProviderModels,
} from './models';
import {
  ProviderNotFoundError,
  ProviderRepository,
} from './repository';
import { getCurrentUsedProviderIds } from './usage';

export class ProviderService {
  private readonly repository: ProviderRepository;

  constructor(
    database: FoundryDatabase,
    private readonly settingsPath = getFoundrySettingsPath(),
  ) {
    this.repository = new ProviderRepository(database.db);
  }

  list(): ProviderListItem[] {
    return this.repository.list(getCurrentUsedProviderIds(this.settingsPath));
  }

  get(id: string): ProviderSummary | null {
    return this.repository.get(id);
  }

  fetchModels(id: string): Promise<RemoteModel[]> {
    const connection = this.repository.getConnection(id);
    if (!connection) {
      throw new ProviderNotFoundError();
    }

    return fetchProviderModels(connection);
  }

  fetchModelsForConnection(connection: ProviderConnection): Promise<RemoteModel[]> {
    return fetchProviderModels(connection);
  }

  save(input: ProviderInput, id?: string): ProviderSummary {
    return this.repository.save(input, id);
  }

  setStatus(id: string, status: ProviderStatus): ProviderSummary {
    return this.repository.setStatus(
      id,
      status,
      getCurrentUsedProviderIds(this.settingsPath),
    );
  }
}
