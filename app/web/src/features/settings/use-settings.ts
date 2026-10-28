import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConfigFolder,
  getSettings,
  setLanguage,
  setLibrary,
  setTheme,
  setTimeFormat,
  setTimezone,
  settingsKeys,
} from './api';
import { captureKeys } from '../captures/api';
import { providerKeys } from '../providers/api';
import { INITIAL_SETTINGS } from './types';
import type { SettingsState, UpdateSetting } from './types';

export function useSettings(): {
  settings: SettingsState;
  configFolderPath: string;
  update: UpdateSetting;
} {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: settingsKeys.current(),
    queryFn: getSettings,
  });
  const configFolderQuery = useQuery({
    queryKey: ['settings', 'config-folder'],
    queryFn: getConfigFolder,
  });
  const updateSettings = (
    storedSettings: Awaited<ReturnType<typeof setTheme>>,
  ) => queryClient.setQueryData(settingsKeys.current(), storedSettings);
  const updateTimeSettings = (
    storedSettings: Awaited<ReturnType<typeof setTheme>>,
  ) => {
    updateSettings(storedSettings);
    void queryClient.invalidateQueries({ queryKey: captureKeys.all });
    void queryClient.invalidateQueries({ queryKey: providerKeys.all });
  };
  const themeMutation = useMutation({ mutationFn: setTheme, onSuccess: updateSettings });
  const libraryMutation = useMutation({ mutationFn: setLibrary, onSuccess: updateSettings });
  const languageMutation = useMutation({ mutationFn: setLanguage, onSuccess: updateSettings });
  const timeFormatMutation = useMutation({
    mutationFn: setTimeFormat,
    onSuccess: updateTimeSettings,
  });
  const timezoneMutation = useMutation({
    mutationFn: setTimezone,
    onSuccess: updateTimeSettings,
  });
  const settings: SettingsState = {
    theme: settingsQuery.data?.workspace.appearance['color-theme'] ?? INITIAL_SETTINGS.theme,
    language: settingsQuery.data?.workspace['language-region'].language ?? INITIAL_SETTINGS.language,
    timeFormat: settingsQuery.data?.workspace['language-region']['time-format'] ?? INITIAL_SETTINGS.timeFormat,
    timezone: settingsQuery.data?.workspace['language-region']['time-zone'] ?? INITIAL_SETTINGS.timezone,
    library: settingsQuery.data?.features.library ?? INITIAL_SETTINGS.library,
  };
  const update: UpdateSetting = (key, value) => {
    switch (key) {
      case 'theme': {
        themeMutation.mutate(value as SettingsState['theme']);
        break;
      }
      case 'language': {
        languageMutation.mutate(value as SettingsState['language']);
        break;
      }
      case 'timeFormat': {
        timeFormatMutation.mutate(value as SettingsState['timeFormat']);
        break;
      }
      case 'timezone': {
        timezoneMutation.mutate(value as SettingsState['timezone']);
        break;
      }
      case 'library': {
        libraryMutation.mutate(value as SettingsState['library']);
        break;
      }
      default: {
        break;
      }
    }
  };

  return {
    settings,
    configFolderPath: configFolderQuery.data ?? '',
    update,
  };
}
