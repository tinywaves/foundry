import type {
  ProviderInput,
  ProviderListItem,
  ProviderSummary,
  RemoteModel,
} from '../shared/providers';
import type {
  BaseSettings,
  LanguageMode,
  RegionCode,
  SettingsSnapshot,
  ThemeMode,
  TimeZoneCode,
} from '../shared/settings';
import type {
  BaseResult,
  CaptureFilter,
  CaptureSummary,
  CreateCaptureInput,
  CreateCaptureResult,
  ScrapeJobFinishedEvent,
  ScrapeJobSummary,
} from '../shared/base';

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
  getConfigFolder: () => Promise<string>;
  setTheme: (theme: ThemeMode) => Promise<SettingsSnapshot>;
  setLanguage: (language: LanguageMode) => Promise<SettingsSnapshot>;
  setRegion: (region: RegionCode) => Promise<SettingsSnapshot>;
  setTimezone: (timezone: TimeZoneCode) => Promise<SettingsSnapshot>;
  setBase: (patch: Partial<BaseSettings>) => Promise<SettingsSnapshot>;
  openConfigFolder: () => Promise<void>;
};

export type BaseApi = {
  listCaptures: (filter?: CaptureFilter) => Promise<CaptureSummary[]>;
  createCapture: (input: CreateCaptureInput) => Promise<BaseResult<CreateCaptureResult>>;
  recapture: (captureId: string) => Promise<BaseResult<ScrapeJobSummary>>;
  deleteCapture: (captureId: string) => Promise<BaseResult<null>>;
  updateNote: (captureId: string, userNote: string) => Promise<BaseResult<CaptureSummary>>;
  listJobs: (captureId: string) => Promise<BaseResult<ScrapeJobSummary[]>>;
  onScrapeJobFinished: (listener: (event: ScrapeJobFinishedEvent) => void) => number;
  offScrapeJobFinished: (subscriptionId: number) => void;
};
