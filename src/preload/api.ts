import type {
  ProviderInput,
  ProviderListItem,
  ProviderSummary,
  RemoteModel,
} from '../shared/providers';
import type { LanguageMode, RegionCode, SettingsSnapshot, ThemeMode, TimeZoneCode } from '../shared/settings';

export type ProviderApi = {
  list: () => Promise<ProviderListItem[]>;
  get: (id: string) => Promise<ProviderSummary | null>;
  save: (input: ProviderInput, id?: string) => Promise<ProviderSummary>;
  setStatus: (id: string, status: 'active' | 'disabled' | 'deleted') => Promise<ProviderSummary>;
  fetchModels: (id: string) => Promise<RemoteModel[]>;
  fetchModelsForInput: (input: Pick<ProviderInput, 'protocol' | 'baseURL' | 'apiKey'>) => Promise<RemoteModel[]>;
};

export type SettingsApi = {
  get: () => Promise<SettingsSnapshot>;
  setTheme: (theme: ThemeMode) => Promise<SettingsSnapshot>;
  setLanguage: (language: LanguageMode) => Promise<SettingsSnapshot>;
  setRegion: (region: RegionCode) => Promise<SettingsSnapshot>;
  setTimezone: (timezone: TimeZoneCode) => Promise<SettingsSnapshot>;
};
