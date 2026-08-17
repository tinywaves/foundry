import type {
  ApplicationColorMode,
  ApplicationSettings,
  SettingsApi,
} from '../../shared/settings-contract';

const defaultApplicationSettings: ApplicationSettings = {
  colorMode: 'system',
};

type SettingsReader = Pick<SettingsApi, 'getApplicationSettings'>;
type SettingsWriter = Pick<SettingsApi, 'updateApplicationColorMode'>;

export async function loadInitialApplicationSettings(
  settingsApi: SettingsReader,
): Promise<ApplicationSettings> {
  try {
    const result = await settingsApi.getApplicationSettings();
    return result.ok ? result.value : defaultApplicationSettings;
  } catch {
    return defaultApplicationSettings;
  }
}

export async function persistApplicationColorMode(
  settingsApi: SettingsWriter,
  colorMode: ApplicationColorMode,
): Promise<void> {
  try {
    await settingsApi.updateApplicationColorMode(colorMode);
  } catch {
    // Dedicated Settings storage failure UX is intentionally deferred.
  }
}
