import type { SettingsPatch, SettingsPayload } from '@dhzh/foundry-shared';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { getSettings, updateSettings } from '../api';

import type { TranslationKey } from '@/i18n/resources';

export const settingsQueryKey = ['settings'] as const;
export const settingsMutationKey = ['settings', 'update'] as const;

export function useSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isUpdating = useIsMutating({ mutationKey: settingsMutationKey }) > 0;
  const query = useQuery({
    queryKey: settingsQueryKey,
    queryFn: ({ signal }) => getSettings(signal),
    staleTime: Infinity,
    retry: false,
  });
  const mutation = useMutation({
    mutationKey: settingsMutationKey,
    mutationFn: updateSettings,
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: settingsQueryKey });
      const previous = queryClient.getQueryData<SettingsPayload>(settingsQueryKey);
      if (previous) {
        queryClient.setQueryData(settingsQueryKey, applyOptimisticPatch(previous, patch));
      }
      return { previous };
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsQueryKey, settings);
    },
    onError: (_error, patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsQueryKey, context.previous);
      }
      toast.error(t(getUpdateErrorKey(patch)));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
  });
  const settings = query.data ?? null;
  const theme = settings?.workspace.appearance['color-theme'] ?? 'system';
  const language = settings?.workspace['language-region'].language ?? 'system';
  const timeFormat = settings?.workspace['language-region']['time-format'] ?? 'YYYY-MM-DD HH:mm:ss';
  const timeZone = settings?.workspace['language-region']['time-zone'] ?? 'America/Los_Angeles';

  function update(patch: SettingsPatch) {
    if (!settings || queryClient.isMutating({ mutationKey: settingsMutationKey }) > 0) {
      return;
    }
    mutation.mutate(patch);
  }

  return {
    settings,
    theme,
    language,
    timeFormat,
    timeZone,
    isLoading: query.isPending,
    isUpdating,
    setTheme: (next: typeof theme) => {
      if (next !== theme) {
        update({ theme: next });
      }
    },
    setLanguage: (next: typeof language) => {
      if (next !== language) {
        update({ language: next });
      }
    },
    setTimeFormat: (next: typeof timeFormat) => {
      if (next !== timeFormat) {
        update({ timeFormat: next });
      }
    },
    setTimeZone: (next: typeof timeZone) => {
      if (next !== timeZone) {
        update({ timezone: next });
      }
    },
  };
}

function applyOptimisticPatch(settings: SettingsPayload, patch: SettingsPatch): SettingsPayload {
  const workspace = settings.workspace;
  const region = workspace['language-region'];
  return {
    ...settings,
    workspace: {
      'appearance': { 'color-theme': patch.theme ?? workspace.appearance['color-theme'] },
      'language-region': {
        'language': patch.language ?? region.language,
        'time-format': patch.timeFormat ?? region['time-format'],
        'time-zone': patch.timezone ?? region['time-zone'],
      },
    },
  };
}

function getUpdateErrorKey(patch: SettingsPatch): TranslationKey {
  if (patch.theme !== undefined) {
    return 'settings.errors.theme';
  }
  if (patch.language !== undefined) {
    return 'settings.errors.language';
  }
  if (patch.timeFormat !== undefined) {
    return 'settings.errors.timeFormat';
  }
  return 'settings.errors.timeZone';
}
