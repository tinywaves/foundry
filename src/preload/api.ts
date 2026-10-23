import type {
  ProviderInput,
  ProviderListItem,
  ProviderSummary,
  RemoteModel,
} from '../shared/providers';
import type {
  LanguageMode,
  LibrarySettings,
  SettingsSnapshot,
  ThemeMode,
  TimeFormatPattern,
  TimeZoneCode,
} from '../shared/settings';
import type {
  CaptureCounts,
  CaptureDetail,
  CaptureFilter,
  CaptureResult,
  CaptureSummary,
  CreateCaptureInput,
  CreateCaptureResult,
  ScrapeJobFinishedEvent,
  ScrapeJobSummary,
} from '../shared/captures';

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
  setTimeFormat: (timeFormat: TimeFormatPattern) => Promise<SettingsSnapshot>;
  setTimezone: (timezone: TimeZoneCode) => Promise<SettingsSnapshot>;
  setLibrary: (patch: Partial<LibrarySettings>) => Promise<SettingsSnapshot>;
  openConfigFolder: () => Promise<void>;
};

export type CaptureApi = {
  listCaptures: (filter?: CaptureFilter) => Promise<CaptureSummary[]>;
  countCaptures: () => Promise<CaptureCounts>;
  getCapture: (captureId: string) => Promise<CaptureResult<CaptureDetail>>;
  createCapture: (input: CreateCaptureInput) => Promise<CaptureResult<CreateCaptureResult>>;
  recapture: (captureId: string) => Promise<CaptureResult<ScrapeJobSummary>>;
  deleteCapture: (captureId: string) => Promise<CaptureResult<null>>;
  updateNote: (captureId: string, userNote: string) => Promise<CaptureResult<CaptureSummary>>;
  listJobs: (captureId: string) => Promise<CaptureResult<ScrapeJobSummary[]>>;
  onScrapeJobFinished: (listener: (event: ScrapeJobFinishedEvent) => void) => number;
  offScrapeJobFinished: (subscriptionId: number) => void;
};
