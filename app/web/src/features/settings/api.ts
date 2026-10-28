import type {
  LanguageMode,
  LibrarySettings,
  SettingsSnapshot,
  ThemeMode,
  TimeFormatPattern,
  TimeZoneCode,
} from '../../shared/settings';
import { requestJSON } from '../../lib/api';
import { queryClient } from '../../lib/query-client';

export type {
  CaptureSettings,
  FetcherType,
  LanguageMode,
  LibrarySettings,
  SettingsSnapshot,
  ThemeMode,
  TimeFormatPattern,
  TimeZoneCode,
} from '../../shared/settings';

export const settingsKeys = {
  current: () => ['settings', 'current'] as const,
};

type SettingsPayload = SettingsSnapshot & { configFolder: string };

export function getSettings(): Promise<SettingsSnapshot> {
  return readSettings();
}

export function getCachedSettings(): Promise<SettingsPayload> {
  return queryClient.query({
    queryKey: settingsKeys.current(),
    queryFn: readSettings,
  });
}

export async function getConfigFolder(): Promise<string> {
  const settings = await getCachedSettings();
  return settings.configFolder;
}

export async function openConfigFolder(): Promise<void> {
  await requestJSON('/api/settings/config-folder/open', { method: 'POST' });
}

export function setTheme(theme: ThemeMode): Promise<SettingsSnapshot> {
  return patchSettings({ theme });
}

export function setLanguage(language: LanguageMode): Promise<SettingsSnapshot> {
  return patchSettings({ language });
}

export function setTimeFormat(timeFormat: TimeFormatPattern): Promise<SettingsSnapshot> {
  return patchSettings({ timeFormat });
}

export function setTimezone(timezone: TimeZoneCode): Promise<SettingsSnapshot> {
  return patchSettings({ timezone });
}

export function setLibrary(patch: Partial<LibrarySettings>): Promise<SettingsSnapshot> {
  const captures = patch.captures;
  return patchSettings({
    captures: captures
      ? {
          fetcher: captures.fetcher,
          maxAttempts: captures.maxAttempts,
          scrapeConcurrency: captures.scrapeConcurrency,
          ...(captures.firecrawl.apiKey && { firecrawlApiKey: captures.firecrawl.apiKey }),
          ...(captures.deepseek.apiKey && { deepseekApiKey: captures.deepseek.apiKey }),
        }
      : undefined,
  });
}

async function readSettings(): Promise<SettingsPayload> {
  const value = await requestJSON<Record<string, unknown>>('/api/settings');
  return normalizeSettings(value);
}

async function patchSettings(patch: Record<string, unknown>): Promise<SettingsSnapshot> {
  const value = await requestJSON<Record<string, unknown>>('/api/settings', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return normalizeSettings(value);
}

function normalizeSettings(
  value: Record<string, unknown>,
): SettingsSnapshot & { configFolder: string } {
  const features = value.features as {
    library: {
      captures: {
        fetcher: SettingsSnapshot['features']['library']['captures']['fetcher'];
        maxAttempts: number;
        scrapeConcurrency: number;
        firecrawl: { hasApiKey: boolean };
        deepseek: { hasApiKey: boolean };
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  const captures = features.library.captures;

  return {
    workspace: value.workspace as SettingsSnapshot['workspace'],
    features: {
      ...features,
      library: {
        ...features.library,
        captures: {
          ...captures,
          firecrawl: { apiKey: '' },
          deepseek: { apiKey: '' },
        },
      },
    },
    configFolder: typeof value.configFolder === 'string' ? value.configFolder : '',
  };
}
