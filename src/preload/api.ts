import type {
  ProviderInput,
  ProviderListItem,
  ProviderSummary,
  RemoteModel,
} from '../shared/providers';

export type ProviderApi = {
  list: () => Promise<ProviderListItem[]>;
  get: (id: string) => Promise<ProviderSummary | null>;
  save: (input: ProviderInput, id?: string) => Promise<ProviderSummary>;
  setStatus: (id: string, status: 'active' | 'disabled' | 'deleted') => Promise<ProviderSummary>;
  fetchModels: (id: string) => Promise<RemoteModel[]>;
  fetchModelsForInput: (input: Pick<ProviderInput, 'protocol' | 'baseURL' | 'apiKey'>) => Promise<RemoteModel[]>;
};

export type SettingsApi = {
  get: () => Promise<{ appearance: { theme: 'system' | 'light' | 'dark' } }>;
  setTheme: (theme: 'system' | 'light' | 'dark') => Promise<{ appearance: { theme: 'system' | 'light' | 'dark' } }>;
};
